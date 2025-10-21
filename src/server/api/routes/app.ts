import { randomUUID } from "node:crypto";
import EventEmitter, { on } from "node:events";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
};

type ConversationEvent =
  | {
      type: "self";
      self: string;
    }
  | {
      type: "message";
      message: ChatMessage;
      self: string;
    };

type ChatEventRecord = {
  id: string;
  event: ConversationEvent;
};

const subscriptions = new Map<string, string>();
const usernameToId = new Map<string, string>();
const emitter = new EventEmitter();

emitter.setMaxListeners(0);

const eventChannel = (userId: string) => `wg-chat:${userId}`;

const requireUser = (ctx: { user?: { id: string; username: string } | undefined }) =>
  ctx.user as { id: string; username: string };

const rememberUser = (userId: string, username: string) => {
  usernameToId.set(username, userId);
};

const emitMessageEvents = (senderId: string, message: ChatMessage) => {
  const senderEvent: ChatEventRecord = {
    id: message.id,
    event: {
      type: "message",
      message,
      self: message.from,
    },
  };
  emitter.emit(eventChannel(senderId), senderEvent);

  const recipientId = usernameToId.get(message.to);
  if (!recipientId) {
    return;
  }

  const recipientSubscribedTo = subscriptions.get(recipientId);
  if (recipientSubscribedTo !== message.from) {
    return;
  }

  const recipientEvent: ChatEventRecord = {
    id: message.id,
    event: {
      type: "message",
      message,
      self: message.to,
    },
  };
  emitter.emit(eventChannel(recipientId), recipientEvent);
};

export const appRouter = router({
  events: protectedProcedure
    .subscription(async function* ({ ctx, signal }) {
      const user = requireUser(ctx);
      rememberUser(user.id, user.username);

      const channel = eventChannel(user.id);
      const iterator = on(emitter, channel, { signal });

      yield tracked(randomUUID(), {
        type: "self",
        self: user.username,
      });

      for await (const [record] of iterator) {
        const payload = record as ChatEventRecord;
        yield tracked(payload.id, payload.event);
      }
    }),
  setRecipient: protectedProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const user = requireUser(ctx);
      rememberUser(user.id, user.username);

      const target = input.username.trim();

      if (target.length === 0) {
        subscriptions.delete(user.id);
        return { recipient: null };
      }

      subscriptions.set(user.id, target);

      return { recipient: target };
    }),
  sendMessage: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        body: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const user = requireUser(ctx);
      rememberUser(user.id, user.username);

      const message: ChatMessage = {
        id: randomUUID(),
        from: user.username,
        to: input.to,
        body: input.body,
        timestamp: Date.now(),
      };

      emitMessageEvents(user.id, message);

      return { id: message.id };
    }),
  currentRecipient: protectedProcedure.query(({ ctx }) => {
    const user = requireUser(ctx);
    rememberUser(user.id, user.username);
    return { recipient: subscriptions.get(user.id) ?? null };
  }),
});
