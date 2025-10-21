"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
};

type SubscriptionEvent =
  | {
      type: "self";
      self: string;
    }
  | {
      type: "message";
      message: ChatMessage;
      self: string;
    };

export default function App() {
  const [self, setSelf] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  trpc.app.events.useSubscription(undefined, {
    onData(event) {
      const payload = event.data as SubscriptionEvent;

      if (payload.type === "self") {
        setSelf(payload.self);
        return;
      }

      if (payload.type !== "message") {
        return;
      }

      setSelf(payload.self);

      setMessages((prev) => {
        if (prev.some((message) => message.id === payload.message.id)) {
          return prev;
        }
        return [...prev, payload.message];
      });
    },
  });

  const { data: initialRecipient } = trpc.app.currentRecipient.useQuery();

  useEffect(() => {
    if (initialRecipient && initialRecipient.recipient !== undefined) {
      setRecipient(initialRecipient.recipient);
    }
  }, [initialRecipient]);

  const utils = trpc.useUtils();

  const setRecipientMutation = trpc.app.setRecipient.useMutation({
    onSuccess(data) {
      setError(null);
      setMessages([]);
      setRecipient(data.recipient);
      void utils.app.currentRecipient.invalidate();
    },
    onError(err) {
      setError(err.message);
    },
  });

  const sendMessageMutation = trpc.app.sendMessage.useMutation({
    onSuccess() {
      setError(null);
    },
    onError(err) {
      setError(err.message);
    },
  });

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp),
    [messages],
  );

  const handleChangeRecipient = () => {
    const next = window.prompt(
      "Who do you want to talk to? Leave blank to clear.",
      recipient ?? "",
    );
    if (next === null) return;
    setRecipientMutation.mutate({ username: next });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient) {
      setError("Choose someone to talk to first.");
      return;
    }

    const text = draft.trim();
    if (!text) return;

    sendMessageMutation.mutate({ to: recipient, body: text });
    setDraft("");
  };

  return (
    <div className="flex flex-col items-center justify-between w-screen h-screen">
      <div className="border-b border-white/20 w-screen p-2 flex items-center justify-center">
        <div className="flex flex-col">
          <span className="text-white/60 font-roboto-flex">RECIPIENT</span>
          <div>
            <span className="text-2xl text-center">
              {recipient ? recipient : "Select a user"}
            </span>
            <button
              type="button"
              className="ml-3 p-2 bg-wg-purple rounded-xl"
              onClick={handleChangeRecipient}
            >
              Change
            </button>
          </div>
        </div>
      </div>
      <div className="p-4 w-screen h-screen space-y-2 overflow-y-auto">
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : null}
        {sortedMessages.length === 0 ? (
          <div className="text-white/40 text-center pt-8">
            {recipient ? "No messages yet." : "Choose someone to start chatting."}
          </div>
        ) : (
          sortedMessages.map((message) => {
            const isSelf = message.from === self;
            return (
              <div className="flex flex-col" key={message.id}>
                <span className="font-semibold">
                  {message.from}
                  {isSelf ? " (you)" : ""}
                </span>
                <span>{message.body}</span>
              </div>
            );
          })
        )}
      </div>
      <form
        className="w-screen p-4 border-t border-white/20"
        onSubmit={handleSubmit}
      >
        <input
          className="p-4 border rounded-xl w-full focus:outline-none"
          placeholder={
            recipient ? `Message ${recipient}...` : "Choose someone before messaging"
          }
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!recipient || sendMessageMutation.isPending}
        />
      </form>
    </div>
  );
}
