import { PubSub, withFilter } from "graphql-subscriptions";

import debug from "debug";
import util from "util";

import R from "ramda";
import uuidv4 from "uuid/v4";

const log = debug("mat-che:resolvers");

const users = {};

var messages = [];

const pubsub = new PubSub();

const getUser = function(session) {
  if (!session.userId || !users[session.userId]) return null;

  return users[session.userId];
};

class Message {
  constructor(user, content) {
    this.id = uuidv4();
    this.user = user;
    this.content = content || "";
  }

  save() {
    if (!this.user) return;
    if (R.trim(this.content) === "") return;

    log("publishing message...");

    const payload = {
      id: this.id,
      user: this.user,
      content: this.content
    };
    messages = R.take(37, R.prepend(payload, messages));
    pubsub.publish("messageAdded", { messageAdded: payload });
  }
}

const randomLetter = function(letters) {
  return letters[Math.floor(Math.random() * letters.length)];
};

const shuffle = function(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
};

const randomUserColor = function() {
  const primary = "012345678";
  const secondary = "0123456789ABCDEF";

  let components = [
    randomLetter(primary) + randomLetter(primary),
    randomLetter(secondary) + randomLetter(secondary),
    randomLetter(secondary) + randomLetter(secondary)
  ];

  shuffle(components);

  return "#" + R.join("", components);
};

export const resolvers = {
  Query: {
    me: (root, args, ctx) => getUser(ctx.session),
    messages: (root, args, ctx) => messages
  },
  Mutation: {
    setName: (root, args, ctx) => {
      const userId = uuidv4();

      ctx.session.userId = userId;
      users[userId] = { name: R.trim(args["name"]), color: randomUserColor() };

      return getUser(ctx.session);
    },
    sendMessage: (root, args, ctx) => {
      const msg = new Message(getUser(ctx.session), args["content"]);

      msg.save();

      return msg;
    }
  },
  Subscription: {
    messageAdded: {
      subscribe: () => pubsub.asyncIterator("messageAdded")
    }
  }
};
