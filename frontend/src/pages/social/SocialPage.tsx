import { Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collection,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  LoadError,
  PageHeader,
  PageTitle,
  PersonRow,
} from "@/brand";
import { pluralize } from "@/domain/format";
import { personDetail, personInitials, personName } from "./present";
import { useSocialPageViewModel } from "./useSocialPageViewModel";

const CODE_INPUT = "friend-code";

interface SocialPageProps { userId: string; }

export function SocialPage({ userId }: SocialPageProps) {
  const navigate = useNavigate();
  const viewModel = useSocialPageViewModel(userId);
  const codeError = viewModel.codeMissing ? "Enter a friend code first." : viewModel.sendError;

  return (
    <div>
      <PageHeader title="Social" subtitle={pluralize(viewModel.friends.length, "friend")} revealAt={100} />

      <div className="flex max-w-2xl flex-col gap-4 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <PageTitle>Social</PageTitle>
            <p className="mt-1 text-sm text-muted-foreground">Add friends with their friend code</p>
          </div>
          <Button variant="outline" onClick={() => void navigate("/inbox")}>
            <Inbox />
            Inbox
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">Add a friend</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                viewModel.sendRequest();
              }}
            >
              <Field>
                <FieldLabel htmlFor={CODE_INPUT}>Friend code</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id={CODE_INPUT}
                    value={viewModel.friendCode}
                    onChange={(event) => viewModel.setFriendCode(event.target.value)}
                    placeholder="e.g. GCAB12CD34"
                    autoComplete="off"
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={codeError ? `${CODE_INPUT}-error` : `${CODE_INPUT}-description`}
                  />
                  <Button type="submit" disabled={viewModel.sending}>
                    {viewModel.sending ? "Sending…" : "Send"}
                  </Button>
                </div>
                <FieldError id={`${CODE_INPUT}-error`}>{codeError}</FieldError>
                {!codeError && (
                  <FieldDescription id={`${CODE_INPUT}-description`}>
                    Sent and received requests are in your inbox.
                  </FieldDescription>
                )}
              </Field>

              {viewModel.sent && (
                <Alert>
                  <AlertDescription>Friend request sent.</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="pb-0">
          <CardHeader>
            <CardTitle className="font-semibold">Friends</CardTitle>
          </CardHeader>

          {viewModel.loadError && (
            <CardContent>
              <LoadError message={viewModel.loadError} />
            </CardContent>
          )}

          <Collection
            layout="divided"
            className="border-t border-border"
            items={viewModel.friends}
            keyFor={(friend) => friend.id}
            loading={viewModel.loading}
            loadingLabel="Loading friends…"
            empty={viewModel.showEmpty ? "No friends yet." : undefined}
            renderItem={(friend) => (
              <PersonRow
                name={personName(friend.other)}
                initials={personInitials(friend.other)}
                detail={personDetail(friend.other)}
              />
            )}
          />
        </Card>
      </div>
    </div>
  );
}
