import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Collection,
  PageHeader,
  PageTitle,
  PersonRow,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { cn } from "@/brand/cn";
import type { Friendship, FriendshipStatus } from "@/data/friendsModel";
import {
  ANSWERED_NOTICES,
  STATUS_LABELS,
  personDetail,
  personInitials,
  personName,
  updatedLabel,
} from "../present";
import { useFriendsInboxPageViewModel, type InboxTab } from "./useFriendsInboxPageViewModel";

const STATUS_TONE: Record<FriendshipStatus, string> = {
  pending: "text-muted-foreground",
  accepted: "text-primary",
  declined: "text-muted-foreground",
  blocked: "text-destructive",
};

interface FriendsInboxPageProps { userId: string; }

export function FriendsInboxPage({ userId }: FriendsInboxPageProps) {
  const navigate = useNavigate();
  const viewModel = useFriendsInboxPageViewModel(userId);

  const renderActions = (request: Friendship) => {
    if (!viewModel.canRespond(request)) {
      return (
        <span className={cn("text-xs font-medium", STATUS_TONE[request.status])}>
          {STATUS_LABELS[request.status]}
        </span>
      );
    }
    const busy = viewModel.isResponding(request.id);
    const name = personName(request.other);
    return (
      <>
        <Button
          size="sm"
          disabled={busy}
          aria-label={`Accept ${name}`}
          onClick={() => viewModel.respond(request.id, "accepted")}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          aria-label={`Decline ${name}`}
          onClick={() => viewModel.respond(request.id, "declined")}
        >
          Decline
        </Button>
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Inbox" subtitle="Friend requests" revealAt={100} />

      <div className="flex max-w-2xl flex-col gap-4 pb-6">
        <div>
          <Button
            variant="linkMuted"
            size="xs"
            className="mb-4 h-auto gap-1.5 p-0 text-body"
            onClick={() => navigate("/social")}
          >
            <ArrowLeft className="size-4" />
            Back to social
          </Button>
          <PageTitle>Inbox</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">Friend requests received and sent</p>
        </div>

        <ToggleGroup
          variant="outline"
          spacing={2}
          value={[viewModel.tab]}
          onValueChange={(values) => {
            const next = values[0] as InboxTab | undefined;
            if (next) viewModel.setTab(next);
          }}
        >
          <ToggleGroupItem value="received">Received ({viewModel.receivedCount})</ToggleGroupItem>
          <ToggleGroupItem value="sent">Sent ({viewModel.sentCount})</ToggleGroupItem>
        </ToggleGroup>

        {viewModel.answered && (
          <Alert>
            <AlertDescription>{ANSWERED_NOTICES[viewModel.answered]}</AlertDescription>
          </Alert>
        )}

        {(viewModel.loadError ?? viewModel.respondError) && (
          <Alert variant="destructive">
            <AlertDescription>{viewModel.loadError ?? viewModel.respondError}</AlertDescription>
          </Alert>
        )}

        <Card className="py-0">
          <Collection
            layout="divided"
            items={viewModel.requests}
            keyFor={(request) => request.id}
            loading={viewModel.loading}
            loadingLabel="Loading inbox…"
            empty={viewModel.showEmpty ? `No ${viewModel.tab} requests yet.` : undefined}
            renderItem={(request) => (
              <PersonRow
                name={personName(request.other)}
                initials={personInitials(request.other)}
                detail={personDetail(request.other)}
                meta={updatedLabel(request.updatedAt)}
                actions={renderActions(request)}
              />
            )}
          />
        </Card>
      </div>
    </div>
  );
}
