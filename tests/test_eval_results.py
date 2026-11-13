"""CLI/archive contracts, including untrusted artifacts and real local Git publication (3a/3b)."""

import copy
import json
import subprocess
from pathlib import Path

import pytest

from scripts import eval_results as archive

SAMPLE = Path(__file__).resolve().parents[1] / 'eval-dashboard/sample-data/runs/2026-11-10-large-sample-before.json'


def payload(run_id='sample-before', day='10'):
    value = json.loads(SAMPLE.read_text())
    value['run']['id'] = run_id
    value['run']['created_at'] = f'2026-11-{day}T12:30:00Z'
    return value


def test_validate_accepts_real_report_and_matches_aggregates():
    p = payload()
    assert archive.validate(p) is p
    assert p['summary']['matched_cells'] == 32
    assert p['summary']['operational_errors'] == 1


@pytest.mark.parametrize('path,value', [
    ('schema_version', True), ('schema_version', 2), ('run.id', '../escape'),
    ('run.commit', '123'), ('run.run_url', 'javascript:alert(1)'), ('run.suite', 'other'),
    ('run.created_at', '2026-99-10T12:30:00Z'), ('run.created_at', '2026-11-10'),
    ('run.branch', 'a'*501), ('summary.matched_cells', 999), ('summary.suite_seconds', float('nan')),
    ('summary.cases', True), ('cases.0.status', 'FAILED'), ('cases.0.matched_cells', 19),
    ('cases.0.total_cells', -1), ('cases.0.diagnostics', ['x']*201), ('cases.0.fingerprint', 'bad'),
    ('cases.1.mismatches.0.actual', True), ('cases.1.mismatches.0.hole', 0),
    ('cases.1.mismatches.0.field', 'other'), ('cases.1.mismatches.0.expected', 1001),
])
def test_rejects_invalid_artifacts(path, value):
    p = payload()
    bits = path.split('.')
    node = p
    for bit in bits[:-1]:
        node = node[int(bit)] if isinstance(node, list) else node[bit]
    key = int(bits[-1]) if isinstance(node, list) else bits[-1]
    node[key] = value
    with pytest.raises(archive.ResultsError):
        archive.validate(p)


@pytest.mark.parametrize('url,valid', [
    ('https://github.com/TuckerBrewer12/BirdieEyeView/actions/runs/123', True),
    ('https://github.com/new-owner/Renamed.Repo/actions/runs/9', True),  # a rename must not break publishing
    ('https://github.com/a/b/actions/runs/1?x=1', False),
    ('https://evil.example/TuckerBrewer12/BirdieEyeView/actions/runs/1', False),
    ('https://github.com/a/b/c/actions/runs/1', False),
])
def test_run_url_accepts_any_github_actions_run_only(url, valid):
    p = payload()
    p['run']['run_url'] = url
    if valid:
        assert archive.validate(p)['run']['run_url'] == url
    else:
        with pytest.raises(archive.ResultsError):
            archive.validate(p)


def test_rejects_unknown_keys_duplicate_identities_and_false_mismatches():
    for change in (
        lambda p: p['run'].update(extra=1),
        lambda p: p['cases'].append(copy.deepcopy(p['cases'][0])),
        lambda p: p['images'].append(copy.deepcopy(p['images'][0])),
        lambda p: p['cases'][1]['mismatches'].append(copy.deepcopy(p['cases'][1]['mismatches'][0])),
        lambda p: p['cases'][1]['mismatches'][0].update(actual=4),
    ):
        p = payload()
        change(p)
        with pytest.raises(archive.ResultsError):
            archive.validate(p)


def test_add_is_idempotent_and_rebuilds_newest_first(tmp_path):
    archive.add(payload(), tmp_path)
    assert '/blob/' + payload()['run']['commit'] + '/eval-dashboard/README.md' in (tmp_path/'README.md').read_text()
    archive.add(payload('new', '12'), tmp_path)
    before = (tmp_path/'index.json').read_bytes()
    archive.add(payload('new', '12'), tmp_path)
    assert (tmp_path/'index.json').read_bytes() == before
    index = json.loads(before)
    assert [entry['run']['id'] for entry in index['runs']] == ['new','sample-before']
    assert index['runs'][0]['without_known_gaps']['cases'] == 2
    assert index['runs'][0]['without_known_gaps']['operational_errors'] == 0
    conflicting = payload('new', '12')
    conflicting['cases'][0]['diagnostics'] = ['different content']
    with pytest.raises(archive.ResultsError, match='conflicting'):
        archive.add(conflicting, tmp_path)
    assert (tmp_path/'index.json').read_bytes() == before


def test_invalid_or_corrupt_archive_writes_nothing(tmp_path):
    p = payload()
    p['summary']['cases'] = 99
    with pytest.raises(archive.ResultsError):
        archive.add(p, tmp_path)
    assert list(tmp_path.iterdir()) == []
    archive.add(payload(), tmp_path)
    (tmp_path/'runs/broken.json').write_text('{}')
    before = (tmp_path/'index.json').read_bytes()
    with pytest.raises(archive.ResultsError):
        archive.add(payload('new'), tmp_path)
    assert not list((tmp_path/'runs').glob('*-new.json'))
    assert (tmp_path/'index.json').read_bytes() == before


def test_file_size_duplicate_keys_and_symlinks_rejected(tmp_path):
    p = tmp_path/'report.json'
    p.write_bytes(b'x'*(archive.MAX_BYTES+1))
    with pytest.raises(archive.ResultsError, match='size'):
        archive.load(p)
    p.write_text('{"schema_version":1,"schema_version":1}')
    with pytest.raises(archive.ResultsError):
        archive.load(p)
    link = tmp_path/'link.json'
    link.symlink_to(p)
    with pytest.raises(archive.ResultsError):
        archive.load(link)


def test_workflow_identity_must_match_before_any_git_writes(tmp_path):
    with pytest.raises(archive.ResultsError, match='workflow id'):
        archive.publish(payload(), tmp_path/'checkout', str(tmp_path/'remote'),
                        environment={'SCAN_EVAL_RUN_ID':'another-run'})
    assert not (tmp_path/'checkout').exists()


def test_publish_preserves_history_and_recovers_a_racing_push(tmp_path, monkeypatch):
    remote = tmp_path/'remote.git'
    subprocess.run(['git','init','--bare','-q',str(remote)],check=True)
    archive.publish(payload(),tmp_path/'first',str(remote),environment={})
    actual_run = subprocess.run
    raced = False

    def run(args, **kwargs):
        nonlocal raced
        if args[:2] == ['git','push'] and not raced:
            raced = True
            archive.publish(payload('racing','11'),tmp_path/'racer',str(remote),environment={})
        return actual_run(args, **kwargs)

    monkeypatch.setattr(subprocess,'run',run)
    monkeypatch.setattr(archive.time,'sleep',lambda seconds: None)
    archive.publish(payload('second','12'),tmp_path/'second',str(remote),environment={})
    data = actual_run(['git','--git-dir',str(remote),'show','eval-results:index.json'],capture_output=True,text=True,check=True)
    assert [entry['run']['id'] for entry in json.loads(data.stdout)['runs']] == ['second','racing','sample-before']
    assert raced


@pytest.mark.parametrize('invalid', [False, True])
def test_workflow_summary_redacts_reports_and_never_uploads_invalid_json(monkeypatch,tmp_path,invalid):
    import textwrap
    from types import SimpleNamespace
    from scripts import quick_scan_eval
    workflow = (SAMPLE.parents[3]/'.github/workflows/scan-evals.yml').read_text()
    body = workflow.split("          python - <<'PY'\n",1)[1].split('\n          PY',1)[0]
    code = textwrap.dedent(body)
    secret = 'provider-"special\\key'
    p = payload('123-1')
    p['cases'][0]['diagnostics'] = [secret + ' <script>alert(1)</script>']
    if invalid:
        p['summary']['cases'] = 99

    def fake_run(*args,**kwargs):
        (tmp_path/'results.json').write_text(json.dumps(p))
        (tmp_path/'summary.md').write_text(secret)
        return SimpleNamespace(returncode=0,stdout='Large scan evaluation\n3 images | 3 cases | 32/54 numeric cells correct\nCases\n'+secret+'\nTotal suite wall time: 24.50s',stderr=secret)

    monkeypatch.setattr(subprocess,'run',fake_run)
    for key,value in {'RUNNER_TEMP':str(tmp_path),'SCAN_EVAL_SUITE':'large','SCAN_EVAL_RUN_ID':'123-1',
                      'GITHUB_STEP_SUMMARY':str(tmp_path/'actions-summary.md'),'GITHUB_OUTPUT':str(tmp_path/'output'),
                      'MISTRAL_API_KEY':secret,'GOOGLE_API_KEY':'another-secret'}.items():
        monkeypatch.setenv(key,value)
    with pytest.raises(SystemExit) as error:
        exec(compile(code,'workflow evaluation step','exec'),{})
    assert error.value.code == 0  # a rejected structured report never changes the eval's own result
    assert secret not in (tmp_path/'scan-eval-report.txt').read_text()
    assert 'run-id=123-1' in (tmp_path/'output').read_text()
    if invalid:
        assert not (tmp_path/'results.json').exists()
        assert not (tmp_path/'summary.md').exists()
    else:
        assert secret not in (tmp_path/'results.json').read_text()
        summary = (tmp_path/'actions-summary.md').read_text()
        assert secret not in summary and '<script>' not in summary
        assert 'Cases' in summary


def test_markdown_summary_stays_below_actions_limit_with_complete_details_blocks():
    from scripts.quick_scan_eval import render_markdown
    p = payload()
    template = p['cases'][1]
    p['cases'] = []
    for i in range(100):
        case = copy.deepcopy(template)
        case.update(id=f'case-{i}',diagnostics=['&'*500]*30)
        p['cases'].append(case)
    p['images'] = [p['images'][1]]
    p['summary'] = archive.aggregate(p['cases'],p['images'],1.0)
    archive.validate(p)
    text = render_markdown(p)
    assert len(text.encode()) < 1_000_000
    assert text.count('<details>') == text.count('</details>')
    assert 'Further case details' in text
