import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/sst/context/context.js
var Context = {
  create,
  reset,
  memo
};
var state = {
  requestID: "",
  contexts: /* @__PURE__ */ new Map(),
  tracking: []
};
function create(cb, name) {
  const id = typeof cb === "string" ? cb : name || Symbol(cb?.toString());
  return {
    use() {
      let result = state.contexts.get(id);
      if (!result) {
        if (!cb || typeof cb === "string")
          throw new Error(`"${String(id)}" context was not provided.`);
        state.tracking.push(id);
        const value = cb();
        state.tracking.pop();
        result = {
          value,
          dependants: /* @__PURE__ */ new Set()
        };
        state.contexts.set(id, result);
      }
      const last = state.tracking[state.tracking.length - 1];
      if (last)
        result.dependants.add(last);
      return result.value;
    },
    reset() {
      resetDependencies(id);
      state.contexts.delete(id);
    },
    provide(value) {
      const requestID = global[Symbol.for("aws.lambda.runtime.requestId")];
      if (state.requestID !== requestID) {
        state.requestID = requestID;
        reset();
      }
      resetDependencies(id);
      state.contexts.set(id, {
        value,
        dependants: /* @__PURE__ */ new Set()
      });
    }
  };
}
__name(create, "create");
function reset() {
  state.contexts.clear();
}
__name(reset, "reset");
function resetDependencies(id) {
  const info = state.contexts.get(id);
  if (!info)
    return;
  for (const dependantID of info.dependants) {
    state.contexts.delete(dependantID);
    resetDependencies(dependantID);
  }
}
__name(resetDependencies, "resetDependencies");
function memo(cb, name) {
  const ctx = create(cb, name);
  return ctx.use;
}
__name(memo, "memo");

// node_modules/sst/context/handler.js
var RequestContext = Context.create("RequestContext");
function Handler(type, cb) {
  return /* @__PURE__ */ __name(function handler2(event, context) {
    RequestContext.provide({ type, event, context });
    return cb(event, context);
  }, "handler");
}
__name(Handler, "Handler");

// node_modules/sst/node/api/index.js
var Response = class {
  static {
    __name(this, "Response");
  }
  result;
  constructor(result) {
    this.result = result;
  }
};
function ApiHandler(cb) {
  return Handler("api", async (evt, ctx) => {
    let result;
    try {
      result = await cb(evt, ctx);
    } catch (e) {
      if (e instanceof Response) {
        result = e.result;
      } else
        throw e;
    }
    const serialized = useResponse().serialize(result || {});
    return serialized;
  });
}
__name(ApiHandler, "ApiHandler");
var useResponse = /* @__PURE__ */ Context.memo(() => {
  const response = {
    headers: {},
    cookies: []
  };
  const result = {
    cookies(values, options) {
      for (const [key, value] of Object.entries(values)) {
        result.cookie({
          key,
          value,
          ...options
        });
      }
      return result;
    },
    cookie(input) {
      input = {
        secure: true,
        sameSite: "None",
        httpOnly: true,
        ...input
      };
      const value = encodeURIComponent(input.value);
      const parts = [input.key + "=" + value];
      if (input.domain)
        parts.push("Domain=" + input.domain);
      if (input.path)
        parts.push("Path=" + input.path);
      if (input.expires)
        parts.push("Expires=" + input.expires.toUTCString());
      if (input.maxAge)
        parts.push("Max-Age=" + input.maxAge);
      if (input.httpOnly)
        parts.push("HttpOnly");
      if (input.secure)
        parts.push("Secure");
      if (input.sameSite)
        parts.push("SameSite=" + input.sameSite);
      response.cookies.push(parts.join("; "));
      return result;
    },
    status(code) {
      response.statusCode = code;
      return result;
    },
    header(key, value) {
      response.headers[key] = value;
      return result;
    },
    serialize(input) {
      return {
        ...response,
        ...input,
        cookies: [...input.cookies || [], ...response.cookies],
        headers: {
          ...response.headers,
          ...input.headers
        }
      };
    }
  };
  return result;
});

// packages/functions/src/time.ts
var handler = ApiHandler(async (evt) => {
  return {
    statusCode: 200,
    body: evt.requestContext.time
  };
});
export {
  handler
};
//# sourceMappingURL=time.mjs.map
