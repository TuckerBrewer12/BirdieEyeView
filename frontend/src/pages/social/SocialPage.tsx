import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Collection,
  CountBadge,
  Field,
  FieldError,
  Input,
  PageHeader,
  PageTitle,
  PersonRow,
  RowButton,
} from "@/brand";
import { useFromBreakpoint } from "@/brand/useFromBreakpoint";
import type { Friendship } from "@/data/friendsModel";
import { pluralize } from "@/domain/format";
import { YourCode } from "./components/YourCode";
import { compareLink, friendDetail, personInitials, personName, requestsLabel } from "./present";
import { useSocialPageViewModel } from "./useSocialPageViewModel";

const CODE_INPUT = "friend-code";

interface SocialPageProps { userId: string; }

export function SocialPage({ userId }: SocialPageProps) {
  const navigate = useNavigate();
  const wide = useFromBreakpoint("md");
  const viewModel = useSocialPageViewModel(userId);
  const codeError = viewModel.codeMissing ? "Enter a friend code first." : viewModel.sendError;

  const renderFriend = (friend: Friendship) => {
    const name = personName(friend.other);
    const row = (
      <PersonRow
        name={name}
        initials={personInitials(friend.other)}
        detail={friendDetail(friend.other)}
        actions={
          wide ? (
            <Button variant="outline" size="sm" render={<Link to={compareLink(friend.other.id)} />} aria-label={`Compare with ${name}`}>
              Compare
            </Button>
          ) : (
            <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
          )
        }
      />
    );
    // On a phone the whole row opens the comparison, as a list of people does there.
    if (wide) return row;
    return (
      <RowButton
        render={<Link to={compareLink(friend.other.id)} />}
        aria-label={`Compare with ${name}`}
        className="block w-full active:bg-muted"
      >
        {row}
      </RowButton>
    );
  };

  return (
    <div>
      <PageHeader title="Social" subtitle={pluralize(viewModel.friends.length, "friend")} revealAt={100} />

      <div className="flex max-w-2xl flex-col gap-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <PageTitle>Social</PageTitle>
          <Button
            variant="outline"
            aria-label={requestsLabel(viewModel.openRequests)}
            onClick={() => void navigate("/inbox")}
          >
            Requests
            <CountBadge count={viewModel.openRequests} />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle level={2}>Add a friend</CardTitle>
            {/* Your code sits in the header from md, under the field on a phone. */}
            <CardAction className="hidden self-center md:block">
              <YourCode code={viewModel.myCode} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                viewModel.sendRequest();
              }}
            >
              <Field>
                <div className="flex items-center gap-2">
                  <Input
                    id={CODE_INPUT}
                    size="inline"
                    value={viewModel.friendCode}
                    onChange={(event) => viewModel.setFriendCode(event.target.value)}
                    placeholder="Friend’s code"
                    aria-label="Friend code"
                    autoComplete="off"
                    aria-invalid={codeError ? true : undefined}
                    aria-describedby={codeError ? `${CODE_INPUT}-error` : undefined}
                  />
                  <Button type="submit" disabled={viewModel.sending}>
                    {viewModel.sending ? "Sending…" : "Send"}
                  </Button>
                </div>
                <FieldError id={`${CODE_INPUT}-error`}>{codeError}</FieldError>
              </Field>
            </form>

            {viewModel.sent && (
              <Alert tone="success">
                <AlertDescription>Friend request sent. You'll find it under Requests.</AlertDescription>
              </Alert>
            )}

            <div className="border-t border-border pt-3 md:hidden">
              <YourCode code={viewModel.myCode} />
            </div>
          </CardContent>
        </Card>

        <Card className="pb-0">
          <CardHeader>
            <CardTitle level={2} className="flex items-baseline gap-2">
              Friends
              {viewModel.friends.length > 0 && (
                <span className="font-normal text-muted-foreground">{viewModel.friends.length}</span>
              )}
            </CardTitle>
          </CardHeader>

          {viewModel.loadError && (
            <CardContent>
              <Alert tone="danger">
                <AlertDescription>{viewModel.loadError}</AlertDescription>
              </Alert>
            </CardContent>
          )}

          <Collection
            layout="divided"
            className="border-t border-border"
            items={viewModel.friends}
            keyFor={(friend) => friend.id}
            loading={viewModel.loading}
            loadingLabel="Loading friends…"
            empty={viewModel.showEmpty ? "No friends yet. Send a friend your code, or add theirs above." : undefined}
            renderItem={renderFriend}
          />
        </Card>
      </div>
    </div>
  );
}
