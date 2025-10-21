import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
};

const MESSAGE_HISTORY_LIMIT = 200;
const subscriptions = new Map<string, string>();
const conversations = new Map<string, ChatMessage[]>();

const conversationKey = (userA: string, userB: string) => {
  const [first, second] = [userA, userB].sort((a, b) => a.localeCompare(b));
  return `${first}::${second}`;
};

const ensureConversation = (userA: string, userB: string) => {
  const key = conversationKey(userA, userB);
  let existing = conversations.get(key);
  if (!existing) {
    existing = [];
    conversations.set(key, existing);
  }
  return existing;
};

const getConversation = (userA: string, userB: string) => {
  const key = conversationKey(userA, userB);
  return conversations.get(key) ?? [];
};

const requireUser = (ctx: { user?: { id: string; username: string } }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "User context missing",
    });
  }
  return ctx.user;
};

export const appRouter = router({
  self: protectedProcedure.query(({ ctx }) => {
    const user = requireUser(ctx);
    return { username: user.username };
  }),
  currentRecipient: protectedProcedure.query(({ ctx }) => {
    const user = requireUser(ctx);
    return { recipient: subscriptions.get(user.id) ?? null };
  }),
  setRecipient: protectedProcedure
    .input(
      z.object({
        username: z.string(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const user = requireUser(ctx);

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

      const recipient = input.to.trim();
      if (!recipient) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Recipient is required to send a message.",
        });
      }

      const text = input.body.trim();
      if (!text) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send an empty message.",
        });
      }

      const message: ChatMessage = {
        id: randomUUID(),
        from: user.username,
        to: recipient,
        body: text,
        timestamp: Date.now(),
      };

      const conversation = ensureConversation(user.username, recipient);
      conversation.push(message);

      if (conversation.length > MESSAGE_HISTORY_LIMIT) {
        conversation.splice(0, conversation.length - MESSAGE_HISTORY_LIMIT);
      }

      return { id: message.id };
    }),
  messages: protectedProcedure
    .input(
      z.object({
        with: z.string(),
      }),
    )
    .query(({ ctx, input }) => {
      const user = requireUser(ctx);
      const other = input.with.trim();

      if (!other) {
        return { messages: [] as ChatMessage[] };
      }

      const messages = getConversation(user.username, other);
      return { messages: [...messages] };
    }),
});
