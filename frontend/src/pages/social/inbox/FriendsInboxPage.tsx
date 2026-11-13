import { ChevronLeft } from "lucide-react";
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
  personInitials,
  personName,
  requestDetail,
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

  const renderAnswers = (request: Friendship, size: "sm" | "default") => {
    const busy = viewModel.isResponding(request.id);
    const name = personName(request.other);
    return (
      <>
        <Button
          size={size}
          variant="outline"
          disabled={busy}
          aria-label={`Decline ${name}`}
          onClick={() => viewModel.respond(request.id, "declined")}
        >
          Decline
        </Button>
        <Button
          size={size}
          disabled={busy}
          aria-label={`Accept ${name}`}
          onClick={() => viewModel.respond(request.id, "accepted")}
        >
          Accept
        </Button>
      </>
    );
  };

  const renderRequest = (request: Friendship) => {
    const open = viewModel.canRespond(request);
    const status = open ? null : (
      <span className={cn("text-body font-semibold", STATUS_TONE[request.status])}>
        {STATUS_LABELS[request.status]}
      </span>
    );
    // A request's answers sit at the row's end from md, and under it, full width, on a phone.
    return (
      <div>
        <PersonRow
          name={personName(request.other)}
          initials={personInitials(request.other)}
          detail={requestDetail(request.updatedAt)}
          settled={request.status !== "pending"}
          actions={open ? <div className="hidden gap-2 md:flex">{renderAnswers(request, "sm")}</div> : status}
        />
        {open && <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:hidden">{renderAnswers(request, "default")}</div>}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Requests" subtitle="Friend requests" revealAt={100} />

      <div className="flex max-w-2xl flex-col gap-4 pb-6">
        <Button
          variant="linkMuted"
          size="inline"
          className="self-start"
          onClick={() => void navigate("/social")}
        >
          <ChevronLeft className="size-4" />
          Social
        </Button>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <PageTitle>Requests</PageTitle>
          <ToggleGroup
            look="boxed"
            aria-label="Requests"
            className="w-full md:w-fit"
            value={[viewModel.tab]}
            onValueChange={(values) => {
              const next = values[0] as InboxTab | undefined;
              if (next) viewModel.setTab(next);
            }}
          >
            <ToggleGroupItem value="received" className="flex-1 md:flex-none">
              Received <span className="text-muted-foreground">{viewModel.receivedCount}</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="sent" className="flex-1 md:flex-none">
              Sent <span className="text-muted-foreground">{viewModel.sentCount}</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {viewModel.answered && (
          <Alert tone="success">
            <AlertDescription>{ANSWERED_NOTICES[viewModel.answered]}</AlertDescription>
          </Alert>
        )}

        {(viewModel.loadError ?? viewModel.respondError) && (
          <Alert tone="danger">
            <AlertDescription>{viewModel.loadError ?? viewModel.respondError}</AlertDescription>
          </Alert>
        )}

        <Card className="py-0">
          <Collection
            layout="divided"
            items={viewModel.requests}
            keyFor={(request) => request.id}
            loading={viewModel.loading}
            loadingLabel="Loading requests…"
            empty={viewModel.showEmpty ? `No ${viewModel.tab} requests yet.` : undefined}
            renderItem={renderRequest}
          />
        </Card>
      </div>
    </div>
  );
}
