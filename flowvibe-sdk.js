"use strict";
var FlowVibe = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    VERSION: () => VERSION4,
    branch: () => branch,
    getTracer: () => getTracer,
    init: () => init,
    isInitialized: () => isInitialized,
    stage: () => stage
  });

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/version.js
  var VERSION = "1.9.1";

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/internal/semver.js
  var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    const acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
    const rejectedVersions = /* @__PURE__ */ new Set();
    const myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) {
      return () => false;
    }
    const ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4]
    };
    if (ownVersionParsed.prerelease != null) {
      return function isExactmatch(globalVersion) {
        return globalVersion === ownVersion;
      };
    }
    function _reject(v) {
      rejectedVersions.add(v);
      return false;
    }
    function _accept(v) {
      acceptedVersions.add(v);
      return true;
    }
    return function isCompatible2(globalVersion) {
      if (acceptedVersions.has(globalVersion)) {
        return true;
      }
      if (rejectedVersions.has(globalVersion)) {
        return false;
      }
      const globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) {
        return _reject(globalVersion);
      }
      const globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4]
      };
      if (globalVersionParsed.prerelease != null) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major !== globalVersionParsed.major) {
        return _reject(globalVersion);
      }
      if (ownVersionParsed.major === 0) {
        if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
          return _accept(globalVersion);
        }
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    };
  }
  var isCompatible = _makeCompatibilityCheck(VERSION);

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
  var major = VERSION.split(".")[0];
  var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for(`opentelemetry.js.api.${major}`);
  var _global = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
  function registerGlobal(type, instance, diag3, allowOverride = false) {
    var _a2;
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a2 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a2 !== void 0 ? _a2 : {
      version: VERSION
    };
    if (!allowOverride && api[type]) {
      const err = new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
      diag3.error(err.stack || err.message);
      return false;
    }
    if (api.version !== VERSION) {
      const err = new Error(`@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${VERSION}`);
      diag3.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag3.debug(`@opentelemetry/api: Registered a global for ${type} v${VERSION}.`);
    return true;
  }
  function getGlobal(type) {
    var _a2, _b;
    const globalVersion = (_a2 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a2 === void 0 ? void 0 : _a2.version;
    if (!globalVersion || !isCompatible(globalVersion)) {
      return;
    }
    return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
  }
  function unregisterGlobal(type, diag3) {
    diag3.debug(`@opentelemetry/api: Unregistering a global for ${type} v${VERSION}.`);
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) {
      delete api[type];
    }
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
  var DiagComponentLogger = class {
    constructor(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    debug(...args) {
      return logProxy("debug", this._namespace, args);
    }
    error(...args) {
      return logProxy("error", this._namespace, args);
    }
    info(...args) {
      return logProxy("info", this._namespace, args);
    }
    warn(...args) {
      return logProxy("warn", this._namespace, args);
    }
    verbose(...args) {
      return logProxy("verbose", this._namespace, args);
    }
  };
  function logProxy(funcName, namespace, args) {
    const logger = getGlobal("diag");
    if (!logger) {
      return;
    }
    return logger[funcName](namespace, ...args);
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/diag/types.js
  var DiagLogLevel;
  (function(DiagLogLevel2) {
    DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
    DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
    DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
    DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
    DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
    DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
    DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
  })(DiagLogLevel || (DiagLogLevel = {}));

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
  function createLogLevelDiagLogger(maxLevel, logger) {
    if (maxLevel < DiagLogLevel.NONE) {
      maxLevel = DiagLogLevel.NONE;
    } else if (maxLevel > DiagLogLevel.ALL) {
      maxLevel = DiagLogLevel.ALL;
    }
    logger = logger || {};
    function _filterFunc(funcName, theLevel) {
      const theFunc = logger[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) {
        return theFunc.bind(logger);
      }
      return function() {
      };
    }
    return {
      error: _filterFunc("error", DiagLogLevel.ERROR),
      warn: _filterFunc("warn", DiagLogLevel.WARN),
      info: _filterFunc("info", DiagLogLevel.INFO),
      debug: _filterFunc("debug", DiagLogLevel.DEBUG),
      verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/api/diag.js
  var API_NAME = "diag";
  var DiagAPI = class _DiagAPI {
    /** Get the singleton instance of the DiagAPI API */
    static instance() {
      if (!this._instance) {
        this._instance = new _DiagAPI();
      }
      return this._instance;
    }
    /**
     * Private internal constructor
     * @private
     */
    constructor() {
      function _logProxy(funcName) {
        return function(...args) {
          const logger = getGlobal("diag");
          if (!logger)
            return;
          return logger[funcName](...args);
        };
      }
      const self2 = this;
      const setLogger = (logger, optionsOrLogLevel = { logLevel: DiagLogLevel.INFO }) => {
        var _a2, _b, _c;
        if (logger === self2) {
          const err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self2.error((_a2 = err.stack) !== null && _a2 !== void 0 ? _a2 : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        const oldLogger = getGlobal("diag");
        const newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          const stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn(`Current logger will be overwritten from ${stack}`);
          newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
        }
        return registerGlobal("diag", newLogger, self2, true);
      };
      self2.setLogger = setLogger;
      self2.disable = () => {
        unregisterGlobal(API_NAME, self2);
      };
      self2.createComponentLogger = (options) => {
        return new DiagComponentLogger(options);
      };
      self2.verbose = _logProxy("verbose");
      self2.debug = _logProxy("debug");
      self2.info = _logProxy("info");
      self2.warn = _logProxy("warn");
      self2.error = _logProxy("error");
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
  var BaggageImpl = class _BaggageImpl {
    constructor(entries) {
      this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
    }
    getEntry(key) {
      const entry = this._entries.get(key);
      if (!entry) {
        return void 0;
      }
      return Object.assign({}, entry);
    }
    getAllEntries() {
      return Array.from(this._entries.entries());
    }
    setEntry(key, entry) {
      const newBaggage = new _BaggageImpl(this._entries);
      newBaggage._entries.set(key, entry);
      return newBaggage;
    }
    removeEntry(key) {
      const newBaggage = new _BaggageImpl(this._entries);
      newBaggage._entries.delete(key);
      return newBaggage;
    }
    removeEntries(...keys) {
      const newBaggage = new _BaggageImpl(this._entries);
      for (const key of keys) {
        newBaggage._entries.delete(key);
      }
      return newBaggage;
    }
    clear() {
      return new _BaggageImpl();
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
  var baggageEntryMetadataSymbol = /* @__PURE__ */ Symbol("BaggageEntryMetadata");

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/baggage/utils.js
  var diag = DiagAPI.instance();
  function createBaggage(entries = {}) {
    return new BaggageImpl(new Map(Object.entries(entries)));
  }
  function baggageEntryMetadataFromString(str) {
    if (typeof str !== "string") {
      diag.error(`Cannot create baggage metadata from unknown type: ${typeof str}`);
      str = "";
    }
    return {
      __TYPE__: baggageEntryMetadataSymbol,
      toString() {
        return str;
      }
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/context/context.js
  function createContextKey(description) {
    return Symbol.for(description);
  }
  var BaseContext = class _BaseContext {
    /**
     * Construct a new context which inherits values from an optional parent context.
     *
     * @param parentContext a context from which to inherit values
     */
    constructor(parentContext) {
      const self2 = this;
      self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self2.getValue = (key) => self2._currentContext.get(key);
      self2.setValue = (key, value) => {
        const context2 = new _BaseContext(self2._currentContext);
        context2._currentContext.set(key, value);
        return context2;
      };
      self2.deleteValue = (key) => {
        const context2 = new _BaseContext(self2._currentContext);
        context2._currentContext.delete(key);
        return context2;
      };
    }
  };
  var ROOT_CONTEXT = new BaseContext();

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
  var defaultTextMapGetter = {
    get(carrier, key) {
      if (carrier == null) {
        return void 0;
      }
      return carrier[key];
    },
    keys(carrier) {
      if (carrier == null) {
        return [];
      }
      return Object.keys(carrier);
    }
  };
  var defaultTextMapSetter = {
    set(carrier, key, value) {
      if (carrier == null) {
        return;
      }
      carrier[key] = value;
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
  var NoopContextManager = class {
    active() {
      return ROOT_CONTEXT;
    }
    with(_context, fn, thisArg, ...args) {
      return fn.call(thisArg, ...args);
    }
    bind(_context, target) {
      return target;
    }
    enable() {
      return this;
    }
    disable() {
      return this;
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/api/context.js
  var API_NAME2 = "context";
  var NOOP_CONTEXT_MANAGER = new NoopContextManager();
  var ContextAPI = class _ContextAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
    }
    /** Get the singleton instance of the Context API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new _ContextAPI();
      }
      return this._instance;
    }
    /**
     * Set the current context manager.
     *
     * @returns true if the context manager was successfully registered, else false
     */
    setGlobalContextManager(contextManager) {
      return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
    }
    /**
     * Get the currently active context
     */
    active() {
      return this._getContextManager().active();
    }
    /**
     * Execute a function with an active context
     *
     * @param context context to be active during function execution
     * @param fn function to execute in a context
     * @param thisArg optional receiver to be used for calling fn
     * @param args optional arguments forwarded to fn
     */
    with(context2, fn, thisArg, ...args) {
      return this._getContextManager().with(context2, fn, thisArg, ...args);
    }
    /**
     * Bind a context to a target function or event emitter
     *
     * @param context context to bind to the event emitter or function. Defaults to the currently active context
     * @param target function or event emitter to bind
     */
    bind(context2, target) {
      return this._getContextManager().bind(context2, target);
    }
    _getContextManager() {
      return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
    }
    /** Disable and remove the global context manager */
    disable() {
      this._getContextManager().disable();
      unregisterGlobal(API_NAME2, DiagAPI.instance());
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
  var TraceFlags;
  (function(TraceFlags2) {
    TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
    TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
  })(TraceFlags || (TraceFlags = {}));

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
  var INVALID_SPANID = "0000000000000000";
  var INVALID_TRACEID = "00000000000000000000000000000000";
  var INVALID_SPAN_CONTEXT = {
    traceId: INVALID_TRACEID,
    spanId: INVALID_SPANID,
    traceFlags: TraceFlags.NONE
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
  var NonRecordingSpan = class {
    constructor(spanContext = INVALID_SPAN_CONTEXT) {
      this._spanContext = spanContext;
    }
    // Returns a SpanContext.
    spanContext() {
      return this._spanContext;
    }
    // By default does nothing
    setAttribute(_key, _value) {
      return this;
    }
    // By default does nothing
    setAttributes(_attributes) {
      return this;
    }
    // By default does nothing
    addEvent(_name, _attributes) {
      return this;
    }
    addLink(_link) {
      return this;
    }
    addLinks(_links) {
      return this;
    }
    // By default does nothing
    setStatus(_status) {
      return this;
    }
    // By default does nothing
    updateName(_name) {
      return this;
    }
    // By default does nothing
    end(_endTime) {
    }
    // isRecording always returns false for NonRecordingSpan.
    isRecording() {
      return false;
    }
    // By default does nothing
    recordException(_exception, _time) {
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
  var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  function getSpan(context2) {
    return context2.getValue(SPAN_KEY) || void 0;
  }
  function getActiveSpan() {
    return getSpan(ContextAPI.getInstance().active());
  }
  function setSpan(context2, span) {
    return context2.setValue(SPAN_KEY, span);
  }
  function deleteSpan(context2) {
    return context2.deleteValue(SPAN_KEY);
  }
  function setSpanContext(context2, spanContext) {
    return setSpan(context2, new NonRecordingSpan(spanContext));
  }
  function getSpanContext(context2) {
    var _a2;
    return (_a2 = getSpan(context2)) === null || _a2 === void 0 ? void 0 : _a2.spanContext();
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
  var isHex = new Uint8Array([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1
  ]);
  function isValidHex(id, length) {
    if (typeof id !== "string" || id.length !== length)
      return false;
    let r = 0;
    for (let i = 0; i < id.length; i += 4) {
      r += (isHex[id.charCodeAt(i)] | 0) + (isHex[id.charCodeAt(i + 1)] | 0) + (isHex[id.charCodeAt(i + 2)] | 0) + (isHex[id.charCodeAt(i + 3)] | 0);
    }
    return r === length;
  }
  function isValidTraceId(traceId) {
    return isValidHex(traceId, 32) && traceId !== INVALID_TRACEID;
  }
  function isValidSpanId(spanId) {
    return isValidHex(spanId, 16) && spanId !== INVALID_SPANID;
  }
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan(spanContext);
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
  var contextApi = ContextAPI.getInstance();
  var NoopTracer = class {
    // startSpan starts a noop span.
    startSpan(name, options, context2 = contextApi.active()) {
      const root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan();
      }
      const parentFromContext = context2 && getSpanContext(context2);
      if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
        return new NonRecordingSpan(parentFromContext);
      } else {
        return new NonRecordingSpan();
      }
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, void 0, span);
    }
  };
  function isSpanContext(spanContext) {
    return spanContext !== null && typeof spanContext === "object" && "spanId" in spanContext && typeof spanContext["spanId"] === "string" && "traceId" in spanContext && typeof spanContext["traceId"] === "string" && "traceFlags" in spanContext && typeof spanContext["traceFlags"] === "number";
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
  var NOOP_TRACER = new NoopTracer();
  var ProxyTracer = class {
    constructor(provider, name, version, options) {
      this._provider = provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    startSpan(name, options, context2) {
      return this._getTracer().startSpan(name, options, context2);
    }
    startActiveSpan(_name, _options, _context, _fn) {
      const tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    }
    /**
     * Try to get a tracer from the proxy tracer provider.
     * If the proxy tracer provider has no delegate, return a noop tracer.
     */
    _getTracer() {
      if (this._delegate) {
        return this._delegate;
      }
      const tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) {
        return NOOP_TRACER;
      }
      this._delegate = tracer;
      return this._delegate;
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
  var NoopTracerProvider = class {
    getTracer(_name, _version, _options) {
      return new NoopTracer();
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
  var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
  var ProxyTracerProvider = class {
    /**
     * Get a {@link ProxyTracer}
     */
    getTracer(name, version, options) {
      var _a2;
      return (_a2 = this.getDelegateTracer(name, version, options)) !== null && _a2 !== void 0 ? _a2 : new ProxyTracer(this, name, version, options);
    }
    getDelegate() {
      var _a2;
      return (_a2 = this._delegate) !== null && _a2 !== void 0 ? _a2 : NOOP_TRACER_PROVIDER;
    }
    /**
     * Set the delegate tracer provider
     */
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateTracer(name, version, options) {
      var _a2;
      return (_a2 = this._delegate) === null || _a2 === void 0 ? void 0 : _a2.getTracer(name, version, options);
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
  var SamplingDecision;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision || (SamplingDecision = {}));

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
  var SpanKind;
  (function(SpanKind2) {
    SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
    SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
    SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
    SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
    SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
  })(SpanKind || (SpanKind = {}));

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace/status.js
  var SpanStatusCode;
  (function(SpanStatusCode2) {
    SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
    SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
    SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
  })(SpanStatusCode || (SpanStatusCode = {}));

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/context-api.js
  var context = ContextAPI.getInstance();

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/diag-api.js
  var diag2 = DiagAPI.instance();

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
  var NoopTextMapPropagator = class {
    /** Noop inject function does nothing */
    inject(_context, _carrier) {
    }
    /** Noop extract function does nothing and returns the input context */
    extract(context2, _carrier) {
      return context2;
    }
    fields() {
      return [];
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
  var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  function getBaggage(context2) {
    return context2.getValue(BAGGAGE_KEY) || void 0;
  }
  function getActiveBaggage() {
    return getBaggage(ContextAPI.getInstance().active());
  }
  function setBaggage(context2, baggage) {
    return context2.setValue(BAGGAGE_KEY, baggage);
  }
  function deleteBaggage(context2) {
    return context2.deleteValue(BAGGAGE_KEY);
  }

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/api/propagation.js
  var API_NAME3 = "propagation";
  var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
  var PropagationAPI = class _PropagationAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this.createBaggage = createBaggage;
      this.getBaggage = getBaggage;
      this.getActiveBaggage = getActiveBaggage;
      this.setBaggage = setBaggage;
      this.deleteBaggage = deleteBaggage;
    }
    /** Get the singleton instance of the Propagator API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new _PropagationAPI();
      }
      return this._instance;
    }
    /**
     * Set the current propagator.
     *
     * @returns true if the propagator was successfully registered, else false
     */
    setGlobalPropagator(propagator) {
      return registerGlobal(API_NAME3, propagator, DiagAPI.instance());
    }
    /**
     * Inject context into a carrier to be propagated inter-process
     *
     * @param context Context carrying tracing data to inject
     * @param carrier carrier to inject context into
     * @param setter Function used to set values on the carrier
     */
    inject(context2, carrier, setter = defaultTextMapSetter) {
      return this._getGlobalPropagator().inject(context2, carrier, setter);
    }
    /**
     * Extract context from a carrier
     *
     * @param context Context which the newly created context will inherit from
     * @param carrier Carrier to extract context from
     * @param getter Function used to extract keys from a carrier
     */
    extract(context2, carrier, getter = defaultTextMapGetter) {
      return this._getGlobalPropagator().extract(context2, carrier, getter);
    }
    /**
     * Return a list of all fields which may be used by the propagator.
     */
    fields() {
      return this._getGlobalPropagator().fields();
    }
    /** Remove the global propagator */
    disable() {
      unregisterGlobal(API_NAME3, DiagAPI.instance());
    }
    _getGlobalPropagator() {
      return getGlobal(API_NAME3) || NOOP_TEXT_MAP_PROPAGATOR;
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/propagation-api.js
  var propagation = PropagationAPI.getInstance();

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/api/trace.js
  var API_NAME4 = "trace";
  var TraceAPI = class _TraceAPI {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this._proxyTracerProvider = new ProxyTracerProvider();
      this.wrapSpanContext = wrapSpanContext;
      this.isSpanContextValid = isSpanContextValid;
      this.deleteSpan = deleteSpan;
      this.getSpan = getSpan;
      this.getActiveSpan = getActiveSpan;
      this.getSpanContext = getSpanContext;
      this.setSpan = setSpan;
      this.setSpanContext = setSpanContext;
    }
    /** Get the singleton instance of the Trace API */
    static getInstance() {
      if (!this._instance) {
        this._instance = new _TraceAPI();
      }
      return this._instance;
    }
    /**
     * Set the current global tracer.
     *
     * @returns true if the tracer provider was successfully registered, else false
     */
    setGlobalTracerProvider(provider) {
      const success = registerGlobal(API_NAME4, this._proxyTracerProvider, DiagAPI.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    }
    /**
     * Returns the global tracer provider.
     */
    getTracerProvider() {
      return getGlobal(API_NAME4) || this._proxyTracerProvider;
    }
    /**
     * Returns a tracer from the global tracer provider.
     */
    getTracer(name, version) {
      return this.getTracerProvider().getTracer(name, version);
    }
    /** Remove the global tracer provider */
    disable() {
      unregisterGlobal(API_NAME4, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+api@1.9.1/node_modules/@opentelemetry/api/build/esm/trace-api.js
  var trace = TraceAPI.getInstance();

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/trace/suppress-tracing.js
  var SUPPRESS_TRACING_KEY = createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
  function suppressTracing(context2) {
    return context2.setValue(SUPPRESS_TRACING_KEY, true);
  }
  function isTracingSuppressed(context2) {
    return context2.getValue(SUPPRESS_TRACING_KEY) === true;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/baggage/constants.js
  var BAGGAGE_KEY_PAIR_SEPARATOR = "=";
  var BAGGAGE_PROPERTIES_SEPARATOR = ";";
  var BAGGAGE_ITEMS_SEPARATOR = ",";
  var BAGGAGE_HEADER = "baggage";
  var BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
  var BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
  var BAGGAGE_MAX_TOTAL_LENGTH = 8192;

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/baggage/utils.js
  var __read = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce(function(hValue, current) {
      var value = "" + hValue + (hValue !== "" ? BAGGAGE_ITEMS_SEPARATOR : "") + current;
      return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, "");
  }
  function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(function(_a2) {
      var _b = __read(_a2, 2), key = _b[0], value = _b[1];
      var entry = encodeURIComponent(key) + "=" + encodeURIComponent(value.value);
      if (value.metadata !== void 0) {
        entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
      }
      return entry;
    });
  }
  function parsePairKeyValue(entry) {
    var valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
      return;
    var keyPairPart = valueProps.shift();
    if (!keyPairPart)
      return;
    var separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0)
      return;
    var key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    var value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    var metadata;
    if (valueProps.length > 0) {
      metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key, value, metadata };
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/baggage/propagation/W3CBaggagePropagator.js
  var W3CBaggagePropagator = (
    /** @class */
    (function() {
      function W3CBaggagePropagator2() {
      }
      W3CBaggagePropagator2.prototype.inject = function(context2, carrier, setter) {
        var baggage = propagation.getBaggage(context2);
        if (!baggage || isTracingSuppressed(context2))
          return;
        var keyPairs = getKeyPairs(baggage).filter(function(pair) {
          return pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
        }).slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
        var headerValue = serializeKeyPairs(keyPairs);
        if (headerValue.length > 0) {
          setter.set(carrier, BAGGAGE_HEADER, headerValue);
        }
      };
      W3CBaggagePropagator2.prototype.extract = function(context2, carrier, getter) {
        var headerValue = getter.get(carrier, BAGGAGE_HEADER);
        var baggageString = Array.isArray(headerValue) ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR) : headerValue;
        if (!baggageString)
          return context2;
        var baggage = {};
        if (baggageString.length === 0) {
          return context2;
        }
        var pairs = baggageString.split(BAGGAGE_ITEMS_SEPARATOR);
        pairs.forEach(function(entry) {
          var keyPair = parsePairKeyValue(entry);
          if (keyPair) {
            var baggageEntry = { value: keyPair.value };
            if (keyPair.metadata) {
              baggageEntry.metadata = keyPair.metadata;
            }
            baggage[keyPair.key] = baggageEntry;
          }
        });
        if (Object.entries(baggage).length === 0) {
          return context2;
        }
        return propagation.setBaggage(context2, propagation.createBaggage(baggage));
      };
      W3CBaggagePropagator2.prototype.fields = function() {
        return [BAGGAGE_HEADER];
      };
      return W3CBaggagePropagator2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/attributes.js
  var __values = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var __read2 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function sanitizeAttributes(attributes) {
    var e_1, _a2;
    var out = {};
    if (typeof attributes !== "object" || attributes == null) {
      return out;
    }
    try {
      for (var _b = __values(Object.entries(attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read2(_c.value, 2), key = _d[0], val = _d[1];
        if (!isAttributeKey(key)) {
          diag2.warn("Invalid attribute key: " + key);
          continue;
        }
        if (!isAttributeValue(val)) {
          diag2.warn("Invalid attribute value set for key: " + key);
          continue;
        }
        if (Array.isArray(val)) {
          out[key] = val.slice();
        } else {
          out[key] = val;
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return out;
  }
  function isAttributeKey(key) {
    return typeof key === "string" && key.length > 0;
  }
  function isAttributeValue(val) {
    if (val == null) {
      return true;
    }
    if (Array.isArray(val)) {
      return isHomogeneousAttributeValueArray(val);
    }
    return isValidPrimitiveAttributeValue(val);
  }
  function isHomogeneousAttributeValueArray(arr) {
    var e_2, _a2;
    var type;
    try {
      for (var arr_1 = __values(arr), arr_1_1 = arr_1.next(); !arr_1_1.done; arr_1_1 = arr_1.next()) {
        var element = arr_1_1.value;
        if (element == null)
          continue;
        if (!type) {
          if (isValidPrimitiveAttributeValue(element)) {
            type = typeof element;
            continue;
          }
          return false;
        }
        if (typeof element === type) {
          continue;
        }
        return false;
      }
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (arr_1_1 && !arr_1_1.done && (_a2 = arr_1.return)) _a2.call(arr_1);
      } finally {
        if (e_2) throw e_2.error;
      }
    }
    return true;
  }
  function isValidPrimitiveAttributeValue(val) {
    switch (typeof val) {
      case "number":
      case "boolean":
      case "string":
        return true;
    }
    return false;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/logging-error-handler.js
  function loggingErrorHandler() {
    return function(ex) {
      diag2.error(stringifyException(ex));
    };
  }
  function stringifyException(ex) {
    if (typeof ex === "string") {
      return ex;
    } else {
      return JSON.stringify(flattenException(ex));
    }
  }
  function flattenException(ex) {
    var result = {};
    var current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach(function(propertyName) {
        if (result[propertyName])
          return;
        var value = current[propertyName];
        if (value) {
          result[propertyName] = String(value);
        }
      });
      current = Object.getPrototypeOf(current);
    }
    return result;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/global-error-handler.js
  var delegateHandler = loggingErrorHandler();
  function globalErrorHandler(ex) {
    try {
      delegateHandler(ex);
    } catch (_a2) {
    }
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/sampling.js
  var TracesSamplerValues;
  (function(TracesSamplerValues3) {
    TracesSamplerValues3["AlwaysOff"] = "always_off";
    TracesSamplerValues3["AlwaysOn"] = "always_on";
    TracesSamplerValues3["ParentBasedAlwaysOff"] = "parentbased_always_off";
    TracesSamplerValues3["ParentBasedAlwaysOn"] = "parentbased_always_on";
    TracesSamplerValues3["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
    TracesSamplerValues3["TraceIdRatio"] = "traceidratio";
  })(TracesSamplerValues || (TracesSamplerValues = {}));

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/environment.js
  var DEFAULT_LIST_SEPARATOR = ",";
  var ENVIRONMENT_BOOLEAN_KEYS = ["OTEL_SDK_DISABLED"];
  function isEnvVarABoolean(key) {
    return ENVIRONMENT_BOOLEAN_KEYS.indexOf(key) > -1;
  }
  var ENVIRONMENT_NUMBERS_KEYS = [
    "OTEL_BSP_EXPORT_TIMEOUT",
    "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BSP_MAX_QUEUE_SIZE",
    "OTEL_BSP_SCHEDULE_DELAY",
    "OTEL_BLRP_EXPORT_TIMEOUT",
    "OTEL_BLRP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BLRP_MAX_QUEUE_SIZE",
    "OTEL_BLRP_SCHEDULE_DELAY",
    "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_LINK_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT",
    "OTEL_EXPORTER_OTLP_TIMEOUT",
    "OTEL_EXPORTER_OTLP_TRACES_TIMEOUT",
    "OTEL_EXPORTER_OTLP_METRICS_TIMEOUT",
    "OTEL_EXPORTER_OTLP_LOGS_TIMEOUT",
    "OTEL_EXPORTER_JAEGER_AGENT_PORT"
  ];
  function isEnvVarANumber(key) {
    return ENVIRONMENT_NUMBERS_KEYS.indexOf(key) > -1;
  }
  var ENVIRONMENT_LISTS_KEYS = [
    "OTEL_NO_PATCH_MODULES",
    "OTEL_PROPAGATORS",
    "OTEL_SEMCONV_STABILITY_OPT_IN"
  ];
  function isEnvVarAList(key) {
    return ENVIRONMENT_LISTS_KEYS.indexOf(key) > -1;
  }
  var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT = Infinity;
  var DEFAULT_ATTRIBUTE_COUNT_LIMIT = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT = 128;
  var DEFAULT_ENVIRONMENT = {
    OTEL_SDK_DISABLED: false,
    CONTAINER_NAME: "",
    ECS_CONTAINER_METADATA_URI_V4: "",
    ECS_CONTAINER_METADATA_URI: "",
    HOSTNAME: "",
    KUBERNETES_SERVICE_HOST: "",
    NAMESPACE: "",
    OTEL_BSP_EXPORT_TIMEOUT: 3e4,
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BSP_MAX_QUEUE_SIZE: 2048,
    OTEL_BSP_SCHEDULE_DELAY: 5e3,
    OTEL_BLRP_EXPORT_TIMEOUT: 3e4,
    OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BLRP_MAX_QUEUE_SIZE: 2048,
    OTEL_BLRP_SCHEDULE_DELAY: 5e3,
    OTEL_EXPORTER_JAEGER_AGENT_HOST: "",
    OTEL_EXPORTER_JAEGER_AGENT_PORT: 6832,
    OTEL_EXPORTER_JAEGER_ENDPOINT: "",
    OTEL_EXPORTER_JAEGER_PASSWORD: "",
    OTEL_EXPORTER_JAEGER_USER: "",
    OTEL_EXPORTER_OTLP_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_HEADERS: "",
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: "",
    OTEL_EXPORTER_OTLP_METRICS_HEADERS: "",
    OTEL_EXPORTER_OTLP_LOGS_HEADERS: "",
    OTEL_EXPORTER_OTLP_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_TRACES_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_LOGS_TIMEOUT: 1e4,
    OTEL_EXPORTER_ZIPKIN_ENDPOINT: "http://localhost:9411/api/v2/spans",
    OTEL_LOG_LEVEL: DiagLogLevel.INFO,
    OTEL_NO_PATCH_MODULES: [],
    OTEL_PROPAGATORS: ["tracecontext", "baggage"],
    OTEL_RESOURCE_ATTRIBUTES: "",
    OTEL_SERVICE_NAME: "",
    OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
    OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT,
    OTEL_SPAN_EVENT_COUNT_LIMIT: 128,
    OTEL_SPAN_LINK_COUNT_LIMIT: 128,
    OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
    OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT,
    OTEL_TRACES_EXPORTER: "",
    OTEL_TRACES_SAMPLER: TracesSamplerValues.ParentBasedAlwaysOn,
    OTEL_TRACES_SAMPLER_ARG: "",
    OTEL_LOGS_EXPORTER: "",
    OTEL_EXPORTER_OTLP_INSECURE: "",
    OTEL_EXPORTER_OTLP_TRACES_INSECURE: "",
    OTEL_EXPORTER_OTLP_METRICS_INSECURE: "",
    OTEL_EXPORTER_OTLP_LOGS_INSECURE: "",
    OTEL_EXPORTER_OTLP_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "cumulative",
    OTEL_SEMCONV_STABILITY_OPT_IN: []
  };
  function parseBoolean(key, environment, values) {
    if (typeof values[key] === "undefined") {
      return;
    }
    var value = String(values[key]);
    environment[key] = value.toLowerCase() === "true";
  }
  function parseNumber(name, environment, values, min, max) {
    if (min === void 0) {
      min = -Infinity;
    }
    if (max === void 0) {
      max = Infinity;
    }
    if (typeof values[name] !== "undefined") {
      var value = Number(values[name]);
      if (!isNaN(value)) {
        if (value < min) {
          environment[name] = min;
        } else if (value > max) {
          environment[name] = max;
        } else {
          environment[name] = value;
        }
      }
    }
  }
  function parseStringList(name, output, input, separator) {
    if (separator === void 0) {
      separator = DEFAULT_LIST_SEPARATOR;
    }
    var givenValue = input[name];
    if (typeof givenValue === "string") {
      output[name] = givenValue.split(separator).map(function(v) {
        return v.trim();
      });
    }
  }
  var logLevelMap = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE
  };
  function setLogLevelFromEnv(key, environment, values) {
    var value = values[key];
    if (typeof value === "string") {
      var theLevel = logLevelMap[value.toUpperCase()];
      if (theLevel != null) {
        environment[key] = theLevel;
      }
    }
  }
  function parseEnvironment(values) {
    var environment = {};
    for (var env in DEFAULT_ENVIRONMENT) {
      var key = env;
      switch (key) {
        case "OTEL_LOG_LEVEL":
          setLogLevelFromEnv(key, environment, values);
          break;
        default:
          if (isEnvVarABoolean(key)) {
            parseBoolean(key, environment, values);
          } else if (isEnvVarANumber(key)) {
            parseNumber(key, environment, values);
          } else if (isEnvVarAList(key)) {
            parseStringList(key, environment, values);
          } else {
            var value = values[key];
            if (typeof value !== "undefined" && value !== null) {
              environment[key] = String(value);
            }
          }
      }
    }
    return environment;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/globalThis.js
  var _globalThis = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getEnv() {
    var globalEnv = parseEnvironment(_globalThis);
    return Object.assign({}, DEFAULT_ENVIRONMENT, globalEnv);
  }
  function getEnvWithoutDefaults() {
    return parseEnvironment(_globalThis);
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/performance.js
  var otperformance = performance;

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/version.js
  var VERSION2 = "1.30.1";

  // ../../node_modules/.pnpm/@opentelemetry+semantic-conventions@1.28.0/node_modules/@opentelemetry/semantic-conventions/build/esm/trace/SemanticAttributes.js
  var TMP_EXCEPTION_TYPE = "exception.type";
  var TMP_EXCEPTION_MESSAGE = "exception.message";
  var TMP_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var SEMATTRS_EXCEPTION_TYPE = TMP_EXCEPTION_TYPE;
  var SEMATTRS_EXCEPTION_MESSAGE = TMP_EXCEPTION_MESSAGE;
  var SEMATTRS_EXCEPTION_STACKTRACE = TMP_EXCEPTION_STACKTRACE;

  // ../../node_modules/.pnpm/@opentelemetry+semantic-conventions@1.28.0/node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
  var TMP_PROCESS_RUNTIME_NAME = "process.runtime.name";
  var TMP_SERVICE_NAME = "service.name";
  var TMP_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
  var TMP_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
  var TMP_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
  var SEMRESATTRS_PROCESS_RUNTIME_NAME = TMP_PROCESS_RUNTIME_NAME;
  var SEMRESATTRS_SERVICE_NAME = TMP_SERVICE_NAME;
  var SEMRESATTRS_TELEMETRY_SDK_NAME = TMP_TELEMETRY_SDK_NAME;
  var SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = TMP_TELEMETRY_SDK_LANGUAGE;
  var SEMRESATTRS_TELEMETRY_SDK_VERSION = TMP_TELEMETRY_SDK_VERSION;
  var TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS = "webjs";
  var TELEMETRYSDKLANGUAGEVALUES_WEBJS = TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS;

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/sdk-info.js
  var _a;
  var SDK_INFO = (_a = {}, _a[SEMRESATTRS_TELEMETRY_SDK_NAME] = "opentelemetry", _a[SEMRESATTRS_PROCESS_RUNTIME_NAME] = "browser", _a[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE] = TELEMETRYSDKLANGUAGEVALUES_WEBJS, _a[SEMRESATTRS_TELEMETRY_SDK_VERSION] = VERSION2, _a);

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/timer-util.js
  function unrefTimer(_timer) {
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS = 9;
  var NANOSECOND_DIGITS_IN_MILLIS = 6;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    var epochSeconds = epochMillis / 1e3;
    var seconds = Math.trunc(epochSeconds);
    var nanos = Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS);
    return [seconds, nanos];
  }
  function getTimeOrigin() {
    var timeOrigin = otperformance.timeOrigin;
    if (typeof timeOrigin !== "number") {
      var perf = otperformance;
      timeOrigin = perf.timing && perf.timing.fetchStart;
    }
    return timeOrigin;
  }
  function hrTime(performanceNow) {
    var timeOrigin = millisToHrTime(getTimeOrigin());
    var now = millisToHrTime(typeof performanceNow === "number" ? performanceNow : otperformance.now());
    return addHrTimes(timeOrigin, now);
  }
  function hrTimeDuration(startTime, endTime) {
    var seconds = endTime[0] - startTime[0];
    var nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  function isTimeInputHrTime(value) {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  function addHrTimes(time1, time2) {
    var out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode;
  (function(ExportResultCode3) {
    ExportResultCode3[ExportResultCode3["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode3[ExportResultCode3["FAILED"] = 1] = "FAILED";
  })(ExportResultCode || (ExportResultCode = {}));

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/propagation/composite.js
  var __values2 = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var CompositePropagator = (
    /** @class */
    (function() {
      function CompositePropagator2(config) {
        if (config === void 0) {
          config = {};
        }
        var _a2;
        this._propagators = (_a2 = config.propagators) !== null && _a2 !== void 0 ? _a2 : [];
        this._fields = Array.from(new Set(this._propagators.map(function(p) {
          return typeof p.fields === "function" ? p.fields() : [];
        }).reduce(function(x, y) {
          return x.concat(y);
        }, [])));
      }
      CompositePropagator2.prototype.inject = function(context2, carrier, setter) {
        var e_1, _a2;
        try {
          for (var _b = __values2(this._propagators), _c = _b.next(); !_c.done; _c = _b.next()) {
            var propagator = _c.value;
            try {
              propagator.inject(context2, carrier, setter);
            } catch (err) {
              diag2.warn("Failed to inject with " + propagator.constructor.name + ". Err: " + err.message);
            }
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      };
      CompositePropagator2.prototype.extract = function(context2, carrier, getter) {
        return this._propagators.reduce(function(ctx, propagator) {
          try {
            return propagator.extract(ctx, carrier, getter);
          } catch (err) {
            diag2.warn("Failed to extract with " + propagator.constructor.name + ". Err: " + err.message);
          }
          return ctx;
        }, context2);
      };
      CompositePropagator2.prototype.fields = function() {
        return this._fields.slice();
      };
      return CompositePropagator2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/internal/validators.js
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
  var VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
  var VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
  var VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  var INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/trace/TraceState.js
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  var TraceState = (
    /** @class */
    (function() {
      function TraceState2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceState2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceState2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceState2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceState2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceState2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            var key = listMember.slice(0, i);
            var value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      };
      TraceState2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceState2.prototype._clone = function() {
        var traceState = new TraceState2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceState2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/trace/W3CTraceContextPropagator.js
  var TRACE_PARENT_HEADER = "traceparent";
  var TRACE_STATE_HEADER = "tracestate";
  var VERSION3 = "00";
  var VERSION_PART = "(?!ff)[\\da-f]{2}";
  var TRACE_ID_PART = "(?![0]{32})[\\da-f]{32}";
  var PARENT_ID_PART = "(?![0]{16})[\\da-f]{16}";
  var FLAGS_PART = "[\\da-f]{2}";
  var TRACE_PARENT_REGEX = new RegExp("^\\s?(" + VERSION_PART + ")-(" + TRACE_ID_PART + ")-(" + PARENT_ID_PART + ")-(" + FLAGS_PART + ")(-.*)?\\s?$");
  function parseTraceParent(traceParent) {
    var match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match)
      return null;
    if (match[1] === "00" && match[5])
      return null;
    return {
      traceId: match[2],
      spanId: match[3],
      traceFlags: parseInt(match[4], 16)
    };
  }
  var W3CTraceContextPropagator = (
    /** @class */
    (function() {
      function W3CTraceContextPropagator2() {
      }
      W3CTraceContextPropagator2.prototype.inject = function(context2, carrier, setter) {
        var spanContext = trace.getSpanContext(context2);
        if (!spanContext || isTracingSuppressed(context2) || !isSpanContextValid(spanContext))
          return;
        var traceParent = VERSION3 + "-" + spanContext.traceId + "-" + spanContext.spanId + "-0" + Number(spanContext.traceFlags || TraceFlags.NONE).toString(16);
        setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
        if (spanContext.traceState) {
          setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
        }
      };
      W3CTraceContextPropagator2.prototype.extract = function(context2, carrier, getter) {
        var traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
        if (!traceParentHeader)
          return context2;
        var traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
        if (typeof traceParent !== "string")
          return context2;
        var spanContext = parseTraceParent(traceParent);
        if (!spanContext)
          return context2;
        spanContext.isRemote = true;
        var traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
        if (traceStateHeader) {
          var state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
          spanContext.traceState = new TraceState(typeof state === "string" ? state : void 0);
        }
        return trace.setSpanContext(context2, spanContext);
      };
      W3CTraceContextPropagator2.prototype.fields = function() {
        return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
      };
      return W3CTraceContextPropagator2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/lodash.merge.js
  var objectTag = "[object Object]";
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  var objectCtorString = funcToString.call(Object);
  var getPrototype = overArg(Object.getPrototypeOf, Object);
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  var nativeObjectToString = objectProto.toString;
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) !== objectTag) {
      return false;
    }
    var proto = getPrototype(value);
    if (proto === null) {
      return true;
    }
    var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
  }
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    var unmasked = false;
    try {
      value[symToStringTag] = void 0;
      unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/merge.js
  var MAX_LEVEL = 20;
  function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var result = args.shift();
    var objects = /* @__PURE__ */ new WeakMap();
    while (args.length > 0) {
      result = mergeTwoObjects(result, args.shift(), 0, objects);
    }
    return result;
  }
  function takeValue(value) {
    if (isArray(value)) {
      return value.slice();
    }
    return value;
  }
  function mergeTwoObjects(one, two, level, objects) {
    if (level === void 0) {
      level = 0;
    }
    var result;
    if (level > MAX_LEVEL) {
      return void 0;
    }
    level++;
    if (isPrimitive(one) || isPrimitive(two) || isFunction(two)) {
      result = takeValue(two);
    } else if (isArray(one)) {
      result = one.slice();
      if (isArray(two)) {
        for (var i = 0, j = two.length; i < j; i++) {
          result.push(takeValue(two[i]));
        }
      } else if (isObject(two)) {
        var keys = Object.keys(two);
        for (var i = 0, j = keys.length; i < j; i++) {
          var key = keys[i];
          result[key] = takeValue(two[key]);
        }
      }
    } else if (isObject(one)) {
      if (isObject(two)) {
        if (!shouldMerge(one, two)) {
          return two;
        }
        result = Object.assign({}, one);
        var keys = Object.keys(two);
        for (var i = 0, j = keys.length; i < j; i++) {
          var key = keys[i];
          var twoValue = two[key];
          if (isPrimitive(twoValue)) {
            if (typeof twoValue === "undefined") {
              delete result[key];
            } else {
              result[key] = twoValue;
            }
          } else {
            var obj1 = result[key];
            var obj2 = twoValue;
            if (wasObjectReferenced(one, key, objects) || wasObjectReferenced(two, key, objects)) {
              delete result[key];
            } else {
              if (isObject(obj1) && isObject(obj2)) {
                var arr1 = objects.get(obj1) || [];
                var arr2 = objects.get(obj2) || [];
                arr1.push({ obj: one, key });
                arr2.push({ obj: two, key });
                objects.set(obj1, arr1);
                objects.set(obj2, arr2);
              }
              result[key] = mergeTwoObjects(result[key], twoValue, level, objects);
            }
          }
        }
      } else {
        result = two;
      }
    }
    return result;
  }
  function wasObjectReferenced(obj, key, objects) {
    var arr = objects.get(obj[key]) || [];
    for (var i = 0, j = arr.length; i < j; i++) {
      var info = arr[i];
      if (info.key === key && info.obj === obj) {
        return true;
      }
    }
    return false;
  }
  function isArray(value) {
    return Array.isArray(value);
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function isObject(value) {
    return !isPrimitive(value) && !isArray(value) && !isFunction(value) && typeof value === "object";
  }
  function isPrimitive(value) {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined" || value instanceof Date || value instanceof RegExp || value === null;
  }
  function shouldMerge(one, two) {
    if (!isPlainObject(one) || !isPlainObject(two)) {
      return false;
    }
    return true;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/promise.js
  var Deferred = (
    /** @class */
    (function() {
      function Deferred3() {
        var _this = this;
        this._promise = new Promise(function(resolve, reject) {
          _this._resolve = resolve;
          _this._reject = reject;
        });
      }
      Object.defineProperty(Deferred3.prototype, "promise", {
        get: function() {
          return this._promise;
        },
        enumerable: false,
        configurable: true
      });
      Deferred3.prototype.resolve = function(val) {
        this._resolve(val);
      };
      Deferred3.prototype.reject = function(err) {
        this._reject(err);
      };
      return Deferred3;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/callback.js
  var __read3 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var BindOnceFuture = (
    /** @class */
    (function() {
      function BindOnceFuture3(_callback, _that) {
        this._callback = _callback;
        this._that = _that;
        this._isCalled = false;
        this._deferred = new Deferred();
      }
      Object.defineProperty(BindOnceFuture3.prototype, "isCalled", {
        get: function() {
          return this._isCalled;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BindOnceFuture3.prototype, "promise", {
        get: function() {
          return this._deferred.promise;
        },
        enumerable: false,
        configurable: true
      });
      BindOnceFuture3.prototype.call = function() {
        var _a2;
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        if (!this._isCalled) {
          this._isCalled = true;
          try {
            Promise.resolve((_a2 = this._callback).call.apply(_a2, __spreadArray([this._that], __read3(args), false))).then(function(val) {
              return _this._deferred.resolve(val);
            }, function(err) {
              return _this._deferred.reject(err);
            });
          } catch (err) {
            this._deferred.reject(err);
          }
        }
        return this._deferred.promise;
      };
      return BindOnceFuture3;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/internal/exporter.js
  function _export(exporter, arg) {
    return new Promise(function(resolve) {
      context.with(suppressTracing(context.active()), function() {
        exporter.export(arg, function(result) {
          resolve(result);
        });
      });
    });
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/index.js
  var internal = {
    _export
  };

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/enums.js
  var ExceptionEventName = "exception";

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/Span.js
  var __assign = function() {
    __assign = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign.apply(this, arguments);
  };
  var __values3 = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var __read4 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray2 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var Span = (
    /** @class */
    (function() {
      function Span2(parentTracer, context2, spanName, spanContext, kind, parentSpanId, links, startTime, _deprecatedClock, attributes) {
        if (links === void 0) {
          links = [];
        }
        this.attributes = {};
        this.links = [];
        this.events = [];
        this._droppedAttributesCount = 0;
        this._droppedEventsCount = 0;
        this._droppedLinksCount = 0;
        this.status = {
          code: SpanStatusCode.UNSET
        };
        this.endTime = [0, 0];
        this._ended = false;
        this._duration = [-1, -1];
        this.name = spanName;
        this._spanContext = spanContext;
        this.parentSpanId = parentSpanId;
        this.kind = kind;
        this.links = links;
        var now = Date.now();
        this._performanceStartTime = otperformance.now();
        this._performanceOffset = now - (this._performanceStartTime + getTimeOrigin());
        this._startTimeProvided = startTime != null;
        this.startTime = this._getTime(startTime !== null && startTime !== void 0 ? startTime : now);
        this.resource = parentTracer.resource;
        this.instrumentationLibrary = parentTracer.instrumentationLibrary;
        this._spanLimits = parentTracer.getSpanLimits();
        this._attributeValueLengthLimit = this._spanLimits.attributeValueLengthLimit || 0;
        if (attributes != null) {
          this.setAttributes(attributes);
        }
        this._spanProcessor = parentTracer.getActiveSpanProcessor();
        this._spanProcessor.onStart(this, context2);
      }
      Span2.prototype.spanContext = function() {
        return this._spanContext;
      };
      Span2.prototype.setAttribute = function(key, value) {
        if (value == null || this._isSpanEnded())
          return this;
        if (key.length === 0) {
          diag2.warn("Invalid attribute key: " + key);
          return this;
        }
        if (!isAttributeValue(value)) {
          diag2.warn("Invalid attribute value set for key: " + key);
          return this;
        }
        if (Object.keys(this.attributes).length >= this._spanLimits.attributeCountLimit && !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
          this._droppedAttributesCount++;
          return this;
        }
        this.attributes[key] = this._truncateToSize(value);
        return this;
      };
      Span2.prototype.setAttributes = function(attributes) {
        var e_1, _a2;
        try {
          for (var _b = __values3(Object.entries(attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read4(_c.value, 2), k = _d[0], v = _d[1];
            this.setAttribute(k, v);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return this;
      };
      Span2.prototype.addEvent = function(name, attributesOrStartTime, timeStamp) {
        if (this._isSpanEnded())
          return this;
        if (this._spanLimits.eventCountLimit === 0) {
          diag2.warn("No events allowed.");
          this._droppedEventsCount++;
          return this;
        }
        if (this.events.length >= this._spanLimits.eventCountLimit) {
          if (this._droppedEventsCount === 0) {
            diag2.debug("Dropping extra events.");
          }
          this.events.shift();
          this._droppedEventsCount++;
        }
        if (isTimeInput(attributesOrStartTime)) {
          if (!isTimeInput(timeStamp)) {
            timeStamp = attributesOrStartTime;
          }
          attributesOrStartTime = void 0;
        }
        var attributes = sanitizeAttributes(attributesOrStartTime);
        this.events.push({
          name,
          attributes,
          time: this._getTime(timeStamp),
          droppedAttributesCount: 0
        });
        return this;
      };
      Span2.prototype.addLink = function(link) {
        this.links.push(link);
        return this;
      };
      Span2.prototype.addLinks = function(links) {
        var _a2;
        (_a2 = this.links).push.apply(_a2, __spreadArray2([], __read4(links), false));
        return this;
      };
      Span2.prototype.setStatus = function(status) {
        if (this._isSpanEnded())
          return this;
        this.status = __assign({}, status);
        if (this.status.message != null && typeof status.message !== "string") {
          diag2.warn("Dropping invalid status.message of type '" + typeof status.message + "', expected 'string'");
          delete this.status.message;
        }
        return this;
      };
      Span2.prototype.updateName = function(name) {
        if (this._isSpanEnded())
          return this;
        this.name = name;
        return this;
      };
      Span2.prototype.end = function(endTime) {
        if (this._isSpanEnded()) {
          diag2.error(this.name + " " + this._spanContext.traceId + "-" + this._spanContext.spanId + " - You can only call end() on a span once.");
          return;
        }
        this._ended = true;
        this.endTime = this._getTime(endTime);
        this._duration = hrTimeDuration(this.startTime, this.endTime);
        if (this._duration[0] < 0) {
          diag2.warn("Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.", this.startTime, this.endTime);
          this.endTime = this.startTime.slice();
          this._duration = [0, 0];
        }
        if (this._droppedEventsCount > 0) {
          diag2.warn("Dropped " + this._droppedEventsCount + " events because eventCountLimit reached");
        }
        this._spanProcessor.onEnd(this);
      };
      Span2.prototype._getTime = function(inp) {
        if (typeof inp === "number" && inp <= otperformance.now()) {
          return hrTime(inp + this._performanceOffset);
        }
        if (typeof inp === "number") {
          return millisToHrTime(inp);
        }
        if (inp instanceof Date) {
          return millisToHrTime(inp.getTime());
        }
        if (isTimeInputHrTime(inp)) {
          return inp;
        }
        if (this._startTimeProvided) {
          return millisToHrTime(Date.now());
        }
        var msDuration = otperformance.now() - this._performanceStartTime;
        return addHrTimes(this.startTime, millisToHrTime(msDuration));
      };
      Span2.prototype.isRecording = function() {
        return this._ended === false;
      };
      Span2.prototype.recordException = function(exception, time) {
        var attributes = {};
        if (typeof exception === "string") {
          attributes[SEMATTRS_EXCEPTION_MESSAGE] = exception;
        } else if (exception) {
          if (exception.code) {
            attributes[SEMATTRS_EXCEPTION_TYPE] = exception.code.toString();
          } else if (exception.name) {
            attributes[SEMATTRS_EXCEPTION_TYPE] = exception.name;
          }
          if (exception.message) {
            attributes[SEMATTRS_EXCEPTION_MESSAGE] = exception.message;
          }
          if (exception.stack) {
            attributes[SEMATTRS_EXCEPTION_STACKTRACE] = exception.stack;
          }
        }
        if (attributes[SEMATTRS_EXCEPTION_TYPE] || attributes[SEMATTRS_EXCEPTION_MESSAGE]) {
          this.addEvent(ExceptionEventName, attributes, time);
        } else {
          diag2.warn("Failed to record an exception " + exception);
        }
      };
      Object.defineProperty(Span2.prototype, "duration", {
        get: function() {
          return this._duration;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "ended", {
        get: function() {
          return this._ended;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedAttributesCount", {
        get: function() {
          return this._droppedAttributesCount;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedEventsCount", {
        get: function() {
          return this._droppedEventsCount;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Span2.prototype, "droppedLinksCount", {
        get: function() {
          return this._droppedLinksCount;
        },
        enumerable: false,
        configurable: true
      });
      Span2.prototype._isSpanEnded = function() {
        if (this._ended) {
          diag2.warn("Can not execute the operation on ended Span {traceId: " + this._spanContext.traceId + ", spanId: " + this._spanContext.spanId + "}");
        }
        return this._ended;
      };
      Span2.prototype._truncateToLimitUtil = function(value, limit) {
        if (value.length <= limit) {
          return value;
        }
        return value.substring(0, limit);
      };
      Span2.prototype._truncateToSize = function(value) {
        var _this = this;
        var limit = this._attributeValueLengthLimit;
        if (limit <= 0) {
          diag2.warn("Attribute value limit must be positive, got " + limit);
          return value;
        }
        if (typeof value === "string") {
          return this._truncateToLimitUtil(value, limit);
        }
        if (Array.isArray(value)) {
          return value.map(function(val) {
            return typeof val === "string" ? _this._truncateToLimitUtil(val, limit) : val;
          });
        }
        return value;
      };
      return Span2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/Sampler.js
  var SamplingDecision2;
  (function(SamplingDecision3) {
    SamplingDecision3[SamplingDecision3["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision3[SamplingDecision3["RECORD"] = 1] = "RECORD";
    SamplingDecision3[SamplingDecision3["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
  })(SamplingDecision2 || (SamplingDecision2 = {}));

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOffSampler.js
  var AlwaysOffSampler = (
    /** @class */
    (function() {
      function AlwaysOffSampler2() {
      }
      AlwaysOffSampler2.prototype.shouldSample = function() {
        return {
          decision: SamplingDecision2.NOT_RECORD
        };
      };
      AlwaysOffSampler2.prototype.toString = function() {
        return "AlwaysOffSampler";
      };
      return AlwaysOffSampler2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
  var AlwaysOnSampler = (
    /** @class */
    (function() {
      function AlwaysOnSampler2() {
      }
      AlwaysOnSampler2.prototype.shouldSample = function() {
        return {
          decision: SamplingDecision2.RECORD_AND_SAMPLED
        };
      };
      AlwaysOnSampler2.prototype.toString = function() {
        return "AlwaysOnSampler";
      };
      return AlwaysOnSampler2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/ParentBasedSampler.js
  var ParentBasedSampler = (
    /** @class */
    (function() {
      function ParentBasedSampler2(config) {
        var _a2, _b, _c, _d;
        this._root = config.root;
        if (!this._root) {
          globalErrorHandler(new Error("ParentBasedSampler must have a root sampler configured"));
          this._root = new AlwaysOnSampler();
        }
        this._remoteParentSampled = (_a2 = config.remoteParentSampled) !== null && _a2 !== void 0 ? _a2 : new AlwaysOnSampler();
        this._remoteParentNotSampled = (_b = config.remoteParentNotSampled) !== null && _b !== void 0 ? _b : new AlwaysOffSampler();
        this._localParentSampled = (_c = config.localParentSampled) !== null && _c !== void 0 ? _c : new AlwaysOnSampler();
        this._localParentNotSampled = (_d = config.localParentNotSampled) !== null && _d !== void 0 ? _d : new AlwaysOffSampler();
      }
      ParentBasedSampler2.prototype.shouldSample = function(context2, traceId, spanName, spanKind, attributes, links) {
        var parentContext = trace.getSpanContext(context2);
        if (!parentContext || !isSpanContextValid(parentContext)) {
          return this._root.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.isRemote) {
          if (parentContext.traceFlags & TraceFlags.SAMPLED) {
            return this._remoteParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
          }
          return this._remoteParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.traceFlags & TraceFlags.SAMPLED) {
          return this._localParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        }
        return this._localParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      };
      ParentBasedSampler2.prototype.toString = function() {
        return "ParentBased{root=" + this._root.toString() + ", remoteParentSampled=" + this._remoteParentSampled.toString() + ", remoteParentNotSampled=" + this._remoteParentNotSampled.toString() + ", localParentSampled=" + this._localParentSampled.toString() + ", localParentNotSampled=" + this._localParentNotSampled.toString() + "}";
      };
      return ParentBasedSampler2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/sampler/TraceIdRatioBasedSampler.js
  var TraceIdRatioBasedSampler = (
    /** @class */
    (function() {
      function TraceIdRatioBasedSampler2(_ratio) {
        if (_ratio === void 0) {
          _ratio = 0;
        }
        this._ratio = _ratio;
        this._ratio = this._normalize(_ratio);
        this._upperBound = Math.floor(this._ratio * 4294967295);
      }
      TraceIdRatioBasedSampler2.prototype.shouldSample = function(context2, traceId) {
        return {
          decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound ? SamplingDecision2.RECORD_AND_SAMPLED : SamplingDecision2.NOT_RECORD
        };
      };
      TraceIdRatioBasedSampler2.prototype.toString = function() {
        return "TraceIdRatioBased{" + this._ratio + "}";
      };
      TraceIdRatioBasedSampler2.prototype._normalize = function(ratio) {
        if (typeof ratio !== "number" || isNaN(ratio))
          return 0;
        return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
      };
      TraceIdRatioBasedSampler2.prototype._accumulate = function(traceId) {
        var accumulation = 0;
        for (var i = 0; i < traceId.length / 8; i++) {
          var pos = i * 8;
          var part = parseInt(traceId.slice(pos, pos + 8), 16);
          accumulation = (accumulation ^ part) >>> 0;
        }
        return accumulation;
      };
      return TraceIdRatioBasedSampler2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/config.js
  var FALLBACK_OTEL_TRACES_SAMPLER = TracesSamplerValues.AlwaysOn;
  var DEFAULT_RATIO = 1;
  function loadDefaultConfig() {
    var env = getEnv();
    return {
      sampler: buildSamplerFromEnv(env),
      forceFlushTimeoutMillis: 3e4,
      generalLimits: {
        attributeValueLengthLimit: env.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT,
        attributeCountLimit: env.OTEL_ATTRIBUTE_COUNT_LIMIT
      },
      spanLimits: {
        attributeValueLengthLimit: env.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT,
        attributeCountLimit: env.OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT,
        linkCountLimit: env.OTEL_SPAN_LINK_COUNT_LIMIT,
        eventCountLimit: env.OTEL_SPAN_EVENT_COUNT_LIMIT,
        attributePerEventCountLimit: env.OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT,
        attributePerLinkCountLimit: env.OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT
      },
      mergeResourceWithDefaults: true
    };
  }
  function buildSamplerFromEnv(environment) {
    if (environment === void 0) {
      environment = getEnv();
    }
    switch (environment.OTEL_TRACES_SAMPLER) {
      case TracesSamplerValues.AlwaysOn:
        return new AlwaysOnSampler();
      case TracesSamplerValues.AlwaysOff:
        return new AlwaysOffSampler();
      case TracesSamplerValues.ParentBasedAlwaysOn:
        return new ParentBasedSampler({
          root: new AlwaysOnSampler()
        });
      case TracesSamplerValues.ParentBasedAlwaysOff:
        return new ParentBasedSampler({
          root: new AlwaysOffSampler()
        });
      case TracesSamplerValues.TraceIdRatio:
        return new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv(environment));
      case TracesSamplerValues.ParentBasedTraceIdRatio:
        return new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(getSamplerProbabilityFromEnv(environment))
        });
      default:
        diag2.error('OTEL_TRACES_SAMPLER value "' + environment.OTEL_TRACES_SAMPLER + " invalid, defaulting to " + FALLBACK_OTEL_TRACES_SAMPLER + '".');
        return new AlwaysOnSampler();
    }
  }
  function getSamplerProbabilityFromEnv(environment) {
    if (environment.OTEL_TRACES_SAMPLER_ARG === void 0 || environment.OTEL_TRACES_SAMPLER_ARG === "") {
      diag2.error("OTEL_TRACES_SAMPLER_ARG is blank, defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    var probability = Number(environment.OTEL_TRACES_SAMPLER_ARG);
    if (isNaN(probability)) {
      diag2.error("OTEL_TRACES_SAMPLER_ARG=" + environment.OTEL_TRACES_SAMPLER_ARG + " was given, but it is invalid, defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    if (probability < 0 || probability > 1) {
      diag2.error("OTEL_TRACES_SAMPLER_ARG=" + environment.OTEL_TRACES_SAMPLER_ARG + " was given, but it is out of range ([0..1]), defaulting to " + DEFAULT_RATIO + ".");
      return DEFAULT_RATIO;
    }
    return probability;
  }

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/utility.js
  function mergeConfig(userConfig) {
    var perInstanceDefaults = {
      sampler: buildSamplerFromEnv()
    };
    var DEFAULT_CONFIG = loadDefaultConfig();
    var target = Object.assign({}, DEFAULT_CONFIG, perInstanceDefaults, userConfig);
    target.generalLimits = Object.assign({}, DEFAULT_CONFIG.generalLimits, userConfig.generalLimits || {});
    target.spanLimits = Object.assign({}, DEFAULT_CONFIG.spanLimits, userConfig.spanLimits || {});
    return target;
  }
  function reconfigureLimits(userConfig) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    var spanLimits = Object.assign({}, userConfig.spanLimits);
    var parsedEnvConfig = getEnvWithoutDefaults();
    spanLimits.attributeCountLimit = (_f = (_e = (_d = (_b = (_a2 = userConfig.spanLimits) === null || _a2 === void 0 ? void 0 : _a2.attributeCountLimit) !== null && _b !== void 0 ? _b : (_c = userConfig.generalLimits) === null || _c === void 0 ? void 0 : _c.attributeCountLimit) !== null && _d !== void 0 ? _d : parsedEnvConfig.OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT) !== null && _e !== void 0 ? _e : parsedEnvConfig.OTEL_ATTRIBUTE_COUNT_LIMIT) !== null && _f !== void 0 ? _f : DEFAULT_ATTRIBUTE_COUNT_LIMIT;
    spanLimits.attributeValueLengthLimit = (_m = (_l = (_k = (_h = (_g = userConfig.spanLimits) === null || _g === void 0 ? void 0 : _g.attributeValueLengthLimit) !== null && _h !== void 0 ? _h : (_j = userConfig.generalLimits) === null || _j === void 0 ? void 0 : _j.attributeValueLengthLimit) !== null && _k !== void 0 ? _k : parsedEnvConfig.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _l !== void 0 ? _l : parsedEnvConfig.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT) !== null && _m !== void 0 ? _m : DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
    return Object.assign({}, userConfig, { spanLimits });
  }

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/export/BatchSpanProcessorBase.js
  var BatchSpanProcessorBase = (
    /** @class */
    (function() {
      function BatchSpanProcessorBase2(_exporter, config) {
        this._exporter = _exporter;
        this._isExporting = false;
        this._finishedSpans = [];
        this._droppedSpansCount = 0;
        var env = getEnv();
        this._maxExportBatchSize = typeof (config === null || config === void 0 ? void 0 : config.maxExportBatchSize) === "number" ? config.maxExportBatchSize : env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE;
        this._maxQueueSize = typeof (config === null || config === void 0 ? void 0 : config.maxQueueSize) === "number" ? config.maxQueueSize : env.OTEL_BSP_MAX_QUEUE_SIZE;
        this._scheduledDelayMillis = typeof (config === null || config === void 0 ? void 0 : config.scheduledDelayMillis) === "number" ? config.scheduledDelayMillis : env.OTEL_BSP_SCHEDULE_DELAY;
        this._exportTimeoutMillis = typeof (config === null || config === void 0 ? void 0 : config.exportTimeoutMillis) === "number" ? config.exportTimeoutMillis : env.OTEL_BSP_EXPORT_TIMEOUT;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        if (this._maxExportBatchSize > this._maxQueueSize) {
          diag2.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
          this._maxExportBatchSize = this._maxQueueSize;
        }
      }
      BatchSpanProcessorBase2.prototype.forceFlush = function() {
        if (this._shutdownOnce.isCalled) {
          return this._shutdownOnce.promise;
        }
        return this._flushAll();
      };
      BatchSpanProcessorBase2.prototype.onStart = function(_span, _parentContext) {
      };
      BatchSpanProcessorBase2.prototype.onEnd = function(span) {
        if (this._shutdownOnce.isCalled) {
          return;
        }
        if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
          return;
        }
        this._addToBuffer(span);
      };
      BatchSpanProcessorBase2.prototype.shutdown = function() {
        return this._shutdownOnce.call();
      };
      BatchSpanProcessorBase2.prototype._shutdown = function() {
        var _this = this;
        return Promise.resolve().then(function() {
          return _this.onShutdown();
        }).then(function() {
          return _this._flushAll();
        }).then(function() {
          return _this._exporter.shutdown();
        });
      };
      BatchSpanProcessorBase2.prototype._addToBuffer = function(span) {
        if (this._finishedSpans.length >= this._maxQueueSize) {
          if (this._droppedSpansCount === 0) {
            diag2.debug("maxQueueSize reached, dropping spans");
          }
          this._droppedSpansCount++;
          return;
        }
        if (this._droppedSpansCount > 0) {
          diag2.warn("Dropped " + this._droppedSpansCount + " spans because maxQueueSize reached");
          this._droppedSpansCount = 0;
        }
        this._finishedSpans.push(span);
        this._maybeStartTimer();
      };
      BatchSpanProcessorBase2.prototype._flushAll = function() {
        var _this = this;
        return new Promise(function(resolve, reject) {
          var promises = [];
          var count = Math.ceil(_this._finishedSpans.length / _this._maxExportBatchSize);
          for (var i = 0, j = count; i < j; i++) {
            promises.push(_this._flushOneBatch());
          }
          Promise.all(promises).then(function() {
            resolve();
          }).catch(reject);
        });
      };
      BatchSpanProcessorBase2.prototype._flushOneBatch = function() {
        var _this = this;
        this._clearTimer();
        if (this._finishedSpans.length === 0) {
          return Promise.resolve();
        }
        return new Promise(function(resolve, reject) {
          var timer = setTimeout(function() {
            reject(new Error("Timeout"));
          }, _this._exportTimeoutMillis);
          context.with(suppressTracing(context.active()), function() {
            var spans;
            if (_this._finishedSpans.length <= _this._maxExportBatchSize) {
              spans = _this._finishedSpans;
              _this._finishedSpans = [];
            } else {
              spans = _this._finishedSpans.splice(0, _this._maxExportBatchSize);
            }
            var doExport = function() {
              return _this._exporter.export(spans, function(result) {
                var _a2;
                clearTimeout(timer);
                if (result.code === ExportResultCode.SUCCESS) {
                  resolve();
                } else {
                  reject((_a2 = result.error) !== null && _a2 !== void 0 ? _a2 : new Error("BatchSpanProcessor: span export failed"));
                }
              });
            };
            var pendingResources = null;
            for (var i = 0, len = spans.length; i < len; i++) {
              var span = spans[i];
              if (span.resource.asyncAttributesPending && span.resource.waitForAsyncAttributes) {
                pendingResources !== null && pendingResources !== void 0 ? pendingResources : pendingResources = [];
                pendingResources.push(span.resource.waitForAsyncAttributes());
              }
            }
            if (pendingResources === null) {
              doExport();
            } else {
              Promise.all(pendingResources).then(doExport, function(err) {
                globalErrorHandler(err);
                reject(err);
              });
            }
          });
        });
      };
      BatchSpanProcessorBase2.prototype._maybeStartTimer = function() {
        var _this = this;
        if (this._isExporting)
          return;
        var flush = function() {
          _this._isExporting = true;
          _this._flushOneBatch().finally(function() {
            _this._isExporting = false;
            if (_this._finishedSpans.length > 0) {
              _this._clearTimer();
              _this._maybeStartTimer();
            }
          }).catch(function(e) {
            _this._isExporting = false;
            globalErrorHandler(e);
          });
        };
        if (this._finishedSpans.length >= this._maxExportBatchSize) {
          return flush();
        }
        if (this._timer !== void 0)
          return;
        this._timer = setTimeout(function() {
          return flush();
        }, this._scheduledDelayMillis);
        unrefTimer(this._timer);
      };
      BatchSpanProcessorBase2.prototype._clearTimer = function() {
        if (this._timer !== void 0) {
          clearTimeout(this._timer);
          this._timer = void 0;
        }
      };
      return BatchSpanProcessorBase2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/export/BatchSpanProcessor.js
  var __extends = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var BatchSpanProcessor = (
    /** @class */
    (function(_super) {
      __extends(BatchSpanProcessor2, _super);
      function BatchSpanProcessor2(_exporter, config) {
        var _this = _super.call(this, _exporter, config) || this;
        _this.onInit(config);
        return _this;
      }
      BatchSpanProcessor2.prototype.onInit = function(config) {
        var _this = this;
        if ((config === null || config === void 0 ? void 0 : config.disableAutoFlushOnDocumentHide) !== true && typeof document !== "undefined") {
          this._visibilityChangeListener = function() {
            if (document.visibilityState === "hidden") {
              _this.forceFlush().catch(function(error) {
                globalErrorHandler(error);
              });
            }
          };
          this._pageHideListener = function() {
            _this.forceFlush().catch(function(error) {
              globalErrorHandler(error);
            });
          };
          document.addEventListener("visibilitychange", this._visibilityChangeListener);
          document.addEventListener("pagehide", this._pageHideListener);
        }
      };
      BatchSpanProcessor2.prototype.onShutdown = function() {
        if (typeof document !== "undefined") {
          if (this._visibilityChangeListener) {
            document.removeEventListener("visibilitychange", this._visibilityChangeListener);
          }
          if (this._pageHideListener) {
            document.removeEventListener("pagehide", this._pageHideListener);
          }
        }
      };
      return BatchSpanProcessor2;
    })(BatchSpanProcessorBase)
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/platform/browser/RandomIdGenerator.js
  var SPAN_ID_BYTES = 8;
  var TRACE_ID_BYTES = 16;
  var RandomIdGenerator2 = (
    /** @class */
    /* @__PURE__ */ (function() {
      function RandomIdGenerator3() {
        this.generateTraceId = getIdGenerator(TRACE_ID_BYTES);
        this.generateSpanId = getIdGenerator(SPAN_ID_BYTES);
      }
      return RandomIdGenerator3;
    })()
  );
  var SHARED_CHAR_CODES_ARRAY = Array(32);
  function getIdGenerator(bytes) {
    return function generateId() {
      for (var i = 0; i < bytes * 2; i++) {
        SHARED_CHAR_CODES_ARRAY[i] = Math.floor(Math.random() * 16) + 48;
        if (SHARED_CHAR_CODES_ARRAY[i] >= 58) {
          SHARED_CHAR_CODES_ARRAY[i] += 39;
        }
      }
      return String.fromCharCode.apply(null, SHARED_CHAR_CODES_ARRAY.slice(0, bytes * 2));
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/Tracer.js
  var Tracer = (
    /** @class */
    (function() {
      function Tracer3(instrumentationLibrary, config, _tracerProvider) {
        this._tracerProvider = _tracerProvider;
        var localConfig = mergeConfig(config);
        this._sampler = localConfig.sampler;
        this._generalLimits = localConfig.generalLimits;
        this._spanLimits = localConfig.spanLimits;
        this._idGenerator = config.idGenerator || new RandomIdGenerator2();
        this.resource = _tracerProvider.resource;
        this.instrumentationLibrary = instrumentationLibrary;
      }
      Tracer3.prototype.startSpan = function(name, options, context2) {
        var _a2, _b, _c;
        if (options === void 0) {
          options = {};
        }
        if (context2 === void 0) {
          context2 = context.active();
        }
        if (options.root) {
          context2 = trace.deleteSpan(context2);
        }
        var parentSpan = trace.getSpan(context2);
        if (isTracingSuppressed(context2)) {
          diag2.debug("Instrumentation suppressed, returning Noop Span");
          var nonRecordingSpan = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
          return nonRecordingSpan;
        }
        var parentSpanContext = parentSpan === null || parentSpan === void 0 ? void 0 : parentSpan.spanContext();
        var spanId = this._idGenerator.generateSpanId();
        var traceId;
        var traceState;
        var parentSpanId;
        if (!parentSpanContext || !trace.isSpanContextValid(parentSpanContext)) {
          traceId = this._idGenerator.generateTraceId();
        } else {
          traceId = parentSpanContext.traceId;
          traceState = parentSpanContext.traceState;
          parentSpanId = parentSpanContext.spanId;
        }
        var spanKind = (_a2 = options.kind) !== null && _a2 !== void 0 ? _a2 : SpanKind.INTERNAL;
        var links = ((_b = options.links) !== null && _b !== void 0 ? _b : []).map(function(link) {
          return {
            context: link.context,
            attributes: sanitizeAttributes(link.attributes)
          };
        });
        var attributes = sanitizeAttributes(options.attributes);
        var samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
        traceState = (_c = samplingResult.traceState) !== null && _c !== void 0 ? _c : traceState;
        var traceFlags = samplingResult.decision === SamplingDecision.RECORD_AND_SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE;
        var spanContext = { traceId, spanId, traceFlags, traceState };
        if (samplingResult.decision === SamplingDecision.NOT_RECORD) {
          diag2.debug("Recording is off, propagating context in a non-recording span");
          var nonRecordingSpan = trace.wrapSpanContext(spanContext);
          return nonRecordingSpan;
        }
        var initAttributes = sanitizeAttributes(Object.assign(attributes, samplingResult.attributes));
        var span = new Span(this, context2, name, spanContext, spanKind, parentSpanId, links, options.startTime, void 0, initAttributes);
        return span;
      };
      Tracer3.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : context.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = trace.setSpan(parentContext, span);
        return context.with(contextWithSpanSet, fn, void 0, span);
      };
      Tracer3.prototype.getGeneralLimits = function() {
        return this._generalLimits;
      };
      Tracer3.prototype.getSpanLimits = function() {
        return this._spanLimits;
      };
      Tracer3.prototype.getActiveSpanProcessor = function() {
        return this._tracerProvider.getActiveSpanProcessor();
      };
      return Tracer3;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+resources@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/resources/build/esm/platform/browser/default-service-name.js
  function defaultServiceName() {
    return "unknown_service";
  }

  // ../../node_modules/.pnpm/@opentelemetry+resources@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/resources/build/esm/Resource.js
  var __assign2 = function() {
    __assign2 = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign2.apply(this, arguments);
  };
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator = function(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var __read5 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var Resource = (
    /** @class */
    (function() {
      function Resource2(attributes, asyncAttributesPromise) {
        var _this = this;
        var _a2;
        this._attributes = attributes;
        this.asyncAttributesPending = asyncAttributesPromise != null;
        this._syncAttributes = (_a2 = this._attributes) !== null && _a2 !== void 0 ? _a2 : {};
        this._asyncAttributesPromise = asyncAttributesPromise === null || asyncAttributesPromise === void 0 ? void 0 : asyncAttributesPromise.then(function(asyncAttributes) {
          _this._attributes = Object.assign({}, _this._attributes, asyncAttributes);
          _this.asyncAttributesPending = false;
          return asyncAttributes;
        }, function(err) {
          diag2.debug("a resource's async attributes promise rejected: %s", err);
          _this.asyncAttributesPending = false;
          return {};
        });
      }
      Resource2.empty = function() {
        return Resource2.EMPTY;
      };
      Resource2.default = function() {
        var _a2;
        return new Resource2((_a2 = {}, _a2[SEMRESATTRS_SERVICE_NAME] = defaultServiceName(), _a2[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_LANGUAGE], _a2[SEMRESATTRS_TELEMETRY_SDK_NAME] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_NAME], _a2[SEMRESATTRS_TELEMETRY_SDK_VERSION] = SDK_INFO[SEMRESATTRS_TELEMETRY_SDK_VERSION], _a2));
      };
      Object.defineProperty(Resource2.prototype, "attributes", {
        get: function() {
          var _a2;
          if (this.asyncAttributesPending) {
            diag2.error("Accessing resource attributes before async attributes settled");
          }
          return (_a2 = this._attributes) !== null && _a2 !== void 0 ? _a2 : {};
        },
        enumerable: false,
        configurable: true
      });
      Resource2.prototype.waitForAsyncAttributes = function() {
        return __awaiter(this, void 0, void 0, function() {
          return __generator(this, function(_a2) {
            switch (_a2.label) {
              case 0:
                if (!this.asyncAttributesPending) return [3, 2];
                return [4, this._asyncAttributesPromise];
              case 1:
                _a2.sent();
                _a2.label = 2;
              case 2:
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      Resource2.prototype.merge = function(other) {
        var _this = this;
        var _a2;
        if (!other)
          return this;
        var mergedSyncAttributes = __assign2(__assign2({}, this._syncAttributes), (_a2 = other._syncAttributes) !== null && _a2 !== void 0 ? _a2 : other.attributes);
        if (!this._asyncAttributesPromise && !other._asyncAttributesPromise) {
          return new Resource2(mergedSyncAttributes);
        }
        var mergedAttributesPromise = Promise.all([
          this._asyncAttributesPromise,
          other._asyncAttributesPromise
        ]).then(function(_a3) {
          var _b;
          var _c = __read5(_a3, 2), thisAsyncAttributes = _c[0], otherAsyncAttributes = _c[1];
          return __assign2(__assign2(__assign2(__assign2({}, _this._syncAttributes), thisAsyncAttributes), (_b = other._syncAttributes) !== null && _b !== void 0 ? _b : other.attributes), otherAsyncAttributes);
        });
        return new Resource2(mergedSyncAttributes, mergedAttributesPromise);
      };
      Resource2.EMPTY = new Resource2({});
      return Resource2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/MultiSpanProcessor.js
  var __values4 = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var MultiSpanProcessor = (
    /** @class */
    (function() {
      function MultiSpanProcessor2(_spanProcessors) {
        this._spanProcessors = _spanProcessors;
      }
      MultiSpanProcessor2.prototype.forceFlush = function() {
        var e_1, _a2;
        var promises = [];
        try {
          for (var _b = __values4(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            promises.push(spanProcessor.forceFlush());
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return new Promise(function(resolve) {
          Promise.all(promises).then(function() {
            resolve();
          }).catch(function(error) {
            globalErrorHandler(error || new Error("MultiSpanProcessor: forceFlush failed"));
            resolve();
          });
        });
      };
      MultiSpanProcessor2.prototype.onStart = function(span, context2) {
        var e_2, _a2;
        try {
          for (var _b = __values4(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            spanProcessor.onStart(span, context2);
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
      };
      MultiSpanProcessor2.prototype.onEnd = function(span) {
        var e_3, _a2;
        try {
          for (var _b = __values4(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            spanProcessor.onEnd(span);
          }
        } catch (e_3_1) {
          e_3 = { error: e_3_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_3) throw e_3.error;
          }
        }
      };
      MultiSpanProcessor2.prototype.shutdown = function() {
        var e_4, _a2;
        var promises = [];
        try {
          for (var _b = __values4(this._spanProcessors), _c = _b.next(); !_c.done; _c = _b.next()) {
            var spanProcessor = _c.value;
            promises.push(spanProcessor.shutdown());
          }
        } catch (e_4_1) {
          e_4 = { error: e_4_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_4) throw e_4.error;
          }
        }
        return new Promise(function(resolve, reject) {
          Promise.all(promises).then(function() {
            resolve();
          }, reject);
        });
      };
      return MultiSpanProcessor2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/export/NoopSpanProcessor.js
  var NoopSpanProcessor = (
    /** @class */
    (function() {
      function NoopSpanProcessor2() {
      }
      NoopSpanProcessor2.prototype.onStart = function(_span, _context) {
      };
      NoopSpanProcessor2.prototype.onEnd = function(_span) {
      };
      NoopSpanProcessor2.prototype.shutdown = function() {
        return Promise.resolve();
      };
      NoopSpanProcessor2.prototype.forceFlush = function() {
        return Promise.resolve();
      };
      return NoopSpanProcessor2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/BasicTracerProvider.js
  var __read6 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray3 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var ForceFlushState;
  (function(ForceFlushState2) {
    ForceFlushState2[ForceFlushState2["resolved"] = 0] = "resolved";
    ForceFlushState2[ForceFlushState2["timeout"] = 1] = "timeout";
    ForceFlushState2[ForceFlushState2["error"] = 2] = "error";
    ForceFlushState2[ForceFlushState2["unresolved"] = 3] = "unresolved";
  })(ForceFlushState || (ForceFlushState = {}));
  var BasicTracerProvider = (
    /** @class */
    (function() {
      function BasicTracerProvider2(config) {
        if (config === void 0) {
          config = {};
        }
        var _a2, _b;
        this._registeredSpanProcessors = [];
        this._tracers = /* @__PURE__ */ new Map();
        var mergedConfig = merge({}, loadDefaultConfig(), reconfigureLimits(config));
        this.resource = (_a2 = mergedConfig.resource) !== null && _a2 !== void 0 ? _a2 : Resource.empty();
        if (mergedConfig.mergeResourceWithDefaults) {
          this.resource = Resource.default().merge(this.resource);
        }
        this._config = Object.assign({}, mergedConfig, {
          resource: this.resource
        });
        if ((_b = config.spanProcessors) === null || _b === void 0 ? void 0 : _b.length) {
          this._registeredSpanProcessors = __spreadArray3([], __read6(config.spanProcessors), false);
          this.activeSpanProcessor = new MultiSpanProcessor(this._registeredSpanProcessors);
        } else {
          var defaultExporter = this._buildExporterFromEnv();
          if (defaultExporter !== void 0) {
            var batchProcessor = new BatchSpanProcessor(defaultExporter);
            this.activeSpanProcessor = batchProcessor;
          } else {
            this.activeSpanProcessor = new NoopSpanProcessor();
          }
        }
      }
      BasicTracerProvider2.prototype.getTracer = function(name, version, options) {
        var key = name + "@" + (version || "") + ":" + ((options === null || options === void 0 ? void 0 : options.schemaUrl) || "");
        if (!this._tracers.has(key)) {
          this._tracers.set(key, new Tracer({ name, version, schemaUrl: options === null || options === void 0 ? void 0 : options.schemaUrl }, this._config, this));
        }
        return this._tracers.get(key);
      };
      BasicTracerProvider2.prototype.addSpanProcessor = function(spanProcessor) {
        if (this._registeredSpanProcessors.length === 0) {
          this.activeSpanProcessor.shutdown().catch(function(err) {
            return diag2.error("Error while trying to shutdown current span processor", err);
          });
        }
        this._registeredSpanProcessors.push(spanProcessor);
        this.activeSpanProcessor = new MultiSpanProcessor(this._registeredSpanProcessors);
      };
      BasicTracerProvider2.prototype.getActiveSpanProcessor = function() {
        return this.activeSpanProcessor;
      };
      BasicTracerProvider2.prototype.register = function(config) {
        if (config === void 0) {
          config = {};
        }
        trace.setGlobalTracerProvider(this);
        if (config.propagator === void 0) {
          config.propagator = this._buildPropagatorFromEnv();
        }
        if (config.contextManager) {
          context.setGlobalContextManager(config.contextManager);
        }
        if (config.propagator) {
          propagation.setGlobalPropagator(config.propagator);
        }
      };
      BasicTracerProvider2.prototype.forceFlush = function() {
        var timeout = this._config.forceFlushTimeoutMillis;
        var promises = this._registeredSpanProcessors.map(function(spanProcessor) {
          return new Promise(function(resolve) {
            var state;
            var timeoutInterval = setTimeout(function() {
              resolve(new Error("Span processor did not completed within timeout period of " + timeout + " ms"));
              state = ForceFlushState.timeout;
            }, timeout);
            spanProcessor.forceFlush().then(function() {
              clearTimeout(timeoutInterval);
              if (state !== ForceFlushState.timeout) {
                state = ForceFlushState.resolved;
                resolve(state);
              }
            }).catch(function(error) {
              clearTimeout(timeoutInterval);
              state = ForceFlushState.error;
              resolve(error);
            });
          });
        });
        return new Promise(function(resolve, reject) {
          Promise.all(promises).then(function(results) {
            var errors = results.filter(function(result) {
              return result !== ForceFlushState.resolved;
            });
            if (errors.length > 0) {
              reject(errors);
            } else {
              resolve();
            }
          }).catch(function(error) {
            return reject([error]);
          });
        });
      };
      BasicTracerProvider2.prototype.shutdown = function() {
        return this.activeSpanProcessor.shutdown();
      };
      BasicTracerProvider2.prototype._getPropagator = function(name) {
        var _a2;
        return (_a2 = this.constructor._registeredPropagators.get(name)) === null || _a2 === void 0 ? void 0 : _a2();
      };
      BasicTracerProvider2.prototype._getSpanExporter = function(name) {
        var _a2;
        return (_a2 = this.constructor._registeredExporters.get(name)) === null || _a2 === void 0 ? void 0 : _a2();
      };
      BasicTracerProvider2.prototype._buildPropagatorFromEnv = function() {
        var _this = this;
        var uniquePropagatorNames = Array.from(new Set(getEnv().OTEL_PROPAGATORS));
        var propagators = uniquePropagatorNames.map(function(name) {
          var propagator = _this._getPropagator(name);
          if (!propagator) {
            diag2.warn('Propagator "' + name + '" requested through environment variable is unavailable.');
          }
          return propagator;
        });
        var validPropagators = propagators.reduce(function(list, item) {
          if (item) {
            list.push(item);
          }
          return list;
        }, []);
        if (validPropagators.length === 0) {
          return;
        } else if (uniquePropagatorNames.length === 1) {
          return validPropagators[0];
        } else {
          return new CompositePropagator({
            propagators: validPropagators
          });
        }
      };
      BasicTracerProvider2.prototype._buildExporterFromEnv = function() {
        var exporterName = getEnv().OTEL_TRACES_EXPORTER;
        if (exporterName === "none" || exporterName === "")
          return;
        var exporter = this._getSpanExporter(exporterName);
        if (!exporter) {
          diag2.error('Exporter "' + exporterName + '" requested through environment variable is unavailable.');
        }
        return exporter;
      };
      BasicTracerProvider2._registeredPropagators = /* @__PURE__ */ new Map([
        ["tracecontext", function() {
          return new W3CTraceContextPropagator();
        }],
        ["baggage", function() {
          return new W3CBaggagePropagator();
        }]
      ]);
      BasicTracerProvider2._registeredExporters = /* @__PURE__ */ new Map();
      return BasicTracerProvider2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-base@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-base/build/esm/export/SimpleSpanProcessor.js
  var __awaiter2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator2 = function(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var SimpleSpanProcessor = (
    /** @class */
    (function() {
      function SimpleSpanProcessor2(_exporter) {
        this._exporter = _exporter;
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
        this._unresolvedExports = /* @__PURE__ */ new Set();
      }
      SimpleSpanProcessor2.prototype.forceFlush = function() {
        return __awaiter2(this, void 0, void 0, function() {
          return __generator2(this, function(_a2) {
            switch (_a2.label) {
              case 0:
                return [4, Promise.all(Array.from(this._unresolvedExports))];
              case 1:
                _a2.sent();
                if (!this._exporter.forceFlush) return [3, 3];
                return [4, this._exporter.forceFlush()];
              case 2:
                _a2.sent();
                _a2.label = 3;
              case 3:
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      SimpleSpanProcessor2.prototype.onStart = function(_span, _parentContext) {
      };
      SimpleSpanProcessor2.prototype.onEnd = function(span) {
        var _this = this;
        var _a2, _b;
        if (this._shutdownOnce.isCalled) {
          return;
        }
        if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) {
          return;
        }
        var doExport = function() {
          return internal._export(_this._exporter, [span]).then(function(result) {
            var _a3;
            if (result.code !== ExportResultCode.SUCCESS) {
              globalErrorHandler((_a3 = result.error) !== null && _a3 !== void 0 ? _a3 : new Error("SimpleSpanProcessor: span export failed (status " + result + ")"));
            }
          }).catch(function(error) {
            globalErrorHandler(error);
          });
        };
        if (span.resource.asyncAttributesPending) {
          var exportPromise_1 = (_b = (_a2 = span.resource).waitForAsyncAttributes) === null || _b === void 0 ? void 0 : _b.call(_a2).then(function() {
            if (exportPromise_1 != null) {
              _this._unresolvedExports.delete(exportPromise_1);
            }
            return doExport();
          }, function(err) {
            return globalErrorHandler(err);
          });
          if (exportPromise_1 != null) {
            this._unresolvedExports.add(exportPromise_1);
          }
        } else {
          void doExport();
        }
      };
      SimpleSpanProcessor2.prototype.shutdown = function() {
        return this._shutdownOnce.call();
      };
      SimpleSpanProcessor2.prototype._shutdown = function() {
        return this._exporter.shutdown();
      };
      return SimpleSpanProcessor2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-web@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-web/build/esm/StackContextManager.js
  var __read7 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray4 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var StackContextManager = (
    /** @class */
    (function() {
      function StackContextManager2() {
        this._enabled = false;
        this._currentContext = ROOT_CONTEXT;
      }
      StackContextManager2.prototype._bindFunction = function(context2, target) {
        if (context2 === void 0) {
          context2 = ROOT_CONTEXT;
        }
        var manager = this;
        var contextWrapper = function() {
          var _this = this;
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          return manager.with(context2, function() {
            return target.apply(_this, args);
          });
        };
        Object.defineProperty(contextWrapper, "length", {
          enumerable: false,
          configurable: true,
          writable: false,
          value: target.length
        });
        return contextWrapper;
      };
      StackContextManager2.prototype.active = function() {
        return this._currentContext;
      };
      StackContextManager2.prototype.bind = function(context2, target) {
        if (context2 === void 0) {
          context2 = this.active();
        }
        if (typeof target === "function") {
          return this._bindFunction(context2, target);
        }
        return target;
      };
      StackContextManager2.prototype.disable = function() {
        this._currentContext = ROOT_CONTEXT;
        this._enabled = false;
        return this;
      };
      StackContextManager2.prototype.enable = function() {
        if (this._enabled) {
          return this;
        }
        this._enabled = true;
        this._currentContext = ROOT_CONTEXT;
        return this;
      };
      StackContextManager2.prototype.with = function(context2, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        var previousContext = this._currentContext;
        this._currentContext = context2 || ROOT_CONTEXT;
        try {
          return fn.call.apply(fn, __spreadArray4([thisArg], __read7(args), false));
        } finally {
          this._currentContext = previousContext;
        }
      };
      return StackContextManager2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+sdk-trace-web@1.30.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/sdk-trace-web/build/esm/WebTracerProvider.js
  var __extends2 = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var WebTracerProvider = (
    /** @class */
    (function(_super) {
      __extends2(WebTracerProvider2, _super);
      function WebTracerProvider2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, config) || this;
        if (config.contextManager) {
          throw "contextManager should be defined in register method not in constructor";
        }
        if (config.propagator) {
          throw "propagator should be defined in register method not in constructor";
        }
        return _this;
      }
      WebTracerProvider2.prototype.register = function(config) {
        if (config === void 0) {
          config = {};
        }
        if (config.contextManager === void 0) {
          config.contextManager = new StackContextManager();
        }
        if (config.contextManager) {
          config.contextManager.enable();
        }
        _super.prototype.register.call(this, config);
      };
      return WebTracerProvider2;
    })(BasicTracerProvider)
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/baggage/constants.js
  var BAGGAGE_KEY_PAIR_SEPARATOR2 = "=";
  var BAGGAGE_PROPERTIES_SEPARATOR2 = ";";
  var BAGGAGE_ITEMS_SEPARATOR2 = ",";
  var BAGGAGE_MAX_TOTAL_LENGTH2 = 8192;

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/baggage/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    getKeyPairs: () => getKeyPairs2,
    parseKeyPairsIntoRecord: () => parseKeyPairsIntoRecord,
    parsePairKeyValue: () => parsePairKeyValue2,
    serializeKeyPairs: () => serializeKeyPairs2
  });
  var __read8 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function serializeKeyPairs2(keyPairs) {
    return keyPairs.reduce(function(hValue, current) {
      var value = "" + hValue + (hValue !== "" ? BAGGAGE_ITEMS_SEPARATOR2 : "") + current;
      return value.length > BAGGAGE_MAX_TOTAL_LENGTH2 ? hValue : value;
    }, "");
  }
  function getKeyPairs2(baggage) {
    return baggage.getAllEntries().map(function(_a2) {
      var _b = __read8(_a2, 2), key = _b[0], value = _b[1];
      var entry = encodeURIComponent(key) + "=" + encodeURIComponent(value.value);
      if (value.metadata !== void 0) {
        entry += BAGGAGE_PROPERTIES_SEPARATOR2 + value.metadata.toString();
      }
      return entry;
    });
  }
  function parsePairKeyValue2(entry) {
    var valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR2);
    if (valueProps.length <= 0)
      return;
    var keyPairPart = valueProps.shift();
    if (!keyPairPart)
      return;
    var separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR2);
    if (separatorIndex <= 0)
      return;
    var key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    var value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    var metadata;
    if (valueProps.length > 0) {
      metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR2));
    }
    return { key, value, metadata };
  }
  function parseKeyPairsIntoRecord(value) {
    if (typeof value !== "string" || value.length === 0)
      return {};
    return value.split(BAGGAGE_ITEMS_SEPARATOR2).map(function(entry) {
      return parsePairKeyValue2(entry);
    }).filter(function(keyPair) {
      return keyPair !== void 0 && keyPair.value.length > 0;
    }).reduce(function(headers, keyPair) {
      headers[keyPair.key] = keyPair.value;
      return headers;
    }, {});
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/sampling.js
  var TracesSamplerValues2;
  (function(TracesSamplerValues3) {
    TracesSamplerValues3["AlwaysOff"] = "always_off";
    TracesSamplerValues3["AlwaysOn"] = "always_on";
    TracesSamplerValues3["ParentBasedAlwaysOff"] = "parentbased_always_off";
    TracesSamplerValues3["ParentBasedAlwaysOn"] = "parentbased_always_on";
    TracesSamplerValues3["ParentBasedTraceIdRatio"] = "parentbased_traceidratio";
    TracesSamplerValues3["TraceIdRatio"] = "traceidratio";
  })(TracesSamplerValues2 || (TracesSamplerValues2 = {}));

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/environment.js
  var DEFAULT_LIST_SEPARATOR2 = ",";
  var ENVIRONMENT_BOOLEAN_KEYS2 = ["OTEL_SDK_DISABLED"];
  function isEnvVarABoolean2(key) {
    return ENVIRONMENT_BOOLEAN_KEYS2.indexOf(key) > -1;
  }
  var ENVIRONMENT_NUMBERS_KEYS2 = [
    "OTEL_BSP_EXPORT_TIMEOUT",
    "OTEL_BSP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BSP_MAX_QUEUE_SIZE",
    "OTEL_BSP_SCHEDULE_DELAY",
    "OTEL_BLRP_EXPORT_TIMEOUT",
    "OTEL_BLRP_MAX_EXPORT_BATCH_SIZE",
    "OTEL_BLRP_MAX_QUEUE_SIZE",
    "OTEL_BLRP_SCHEDULE_DELAY",
    "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT",
    "OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT",
    "OTEL_SPAN_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_LINK_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT",
    "OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT",
    "OTEL_EXPORTER_OTLP_TIMEOUT",
    "OTEL_EXPORTER_OTLP_TRACES_TIMEOUT",
    "OTEL_EXPORTER_OTLP_METRICS_TIMEOUT",
    "OTEL_EXPORTER_OTLP_LOGS_TIMEOUT",
    "OTEL_EXPORTER_JAEGER_AGENT_PORT"
  ];
  function isEnvVarANumber2(key) {
    return ENVIRONMENT_NUMBERS_KEYS2.indexOf(key) > -1;
  }
  var ENVIRONMENT_LISTS_KEYS2 = [
    "OTEL_NO_PATCH_MODULES",
    "OTEL_PROPAGATORS"
  ];
  function isEnvVarAList2(key) {
    return ENVIRONMENT_LISTS_KEYS2.indexOf(key) > -1;
  }
  var DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT2 = Infinity;
  var DEFAULT_ATTRIBUTE_COUNT_LIMIT2 = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT2 = 128;
  var DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT2 = 128;
  var DEFAULT_ENVIRONMENT2 = {
    OTEL_SDK_DISABLED: false,
    CONTAINER_NAME: "",
    ECS_CONTAINER_METADATA_URI_V4: "",
    ECS_CONTAINER_METADATA_URI: "",
    HOSTNAME: "",
    KUBERNETES_SERVICE_HOST: "",
    NAMESPACE: "",
    OTEL_BSP_EXPORT_TIMEOUT: 3e4,
    OTEL_BSP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BSP_MAX_QUEUE_SIZE: 2048,
    OTEL_BSP_SCHEDULE_DELAY: 5e3,
    OTEL_BLRP_EXPORT_TIMEOUT: 3e4,
    OTEL_BLRP_MAX_EXPORT_BATCH_SIZE: 512,
    OTEL_BLRP_MAX_QUEUE_SIZE: 2048,
    OTEL_BLRP_SCHEDULE_DELAY: 5e3,
    OTEL_EXPORTER_JAEGER_AGENT_HOST: "",
    OTEL_EXPORTER_JAEGER_AGENT_PORT: 6832,
    OTEL_EXPORTER_JAEGER_ENDPOINT: "",
    OTEL_EXPORTER_JAEGER_PASSWORD: "",
    OTEL_EXPORTER_JAEGER_USER: "",
    OTEL_EXPORTER_OTLP_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "",
    OTEL_EXPORTER_OTLP_HEADERS: "",
    OTEL_EXPORTER_OTLP_TRACES_HEADERS: "",
    OTEL_EXPORTER_OTLP_METRICS_HEADERS: "",
    OTEL_EXPORTER_OTLP_LOGS_HEADERS: "",
    OTEL_EXPORTER_OTLP_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_TRACES_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_METRICS_TIMEOUT: 1e4,
    OTEL_EXPORTER_OTLP_LOGS_TIMEOUT: 1e4,
    OTEL_EXPORTER_ZIPKIN_ENDPOINT: "http://localhost:9411/api/v2/spans",
    OTEL_LOG_LEVEL: DiagLogLevel.INFO,
    OTEL_NO_PATCH_MODULES: [],
    OTEL_PROPAGATORS: ["tracecontext", "baggage"],
    OTEL_RESOURCE_ATTRIBUTES: "",
    OTEL_SERVICE_NAME: "",
    OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT2,
    OTEL_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT2,
    OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT2,
    OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT2,
    OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT: DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT2,
    OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT: DEFAULT_ATTRIBUTE_COUNT_LIMIT2,
    OTEL_SPAN_EVENT_COUNT_LIMIT: 128,
    OTEL_SPAN_LINK_COUNT_LIMIT: 128,
    OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT2,
    OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT: DEFAULT_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT2,
    OTEL_TRACES_EXPORTER: "",
    OTEL_TRACES_SAMPLER: TracesSamplerValues2.ParentBasedAlwaysOn,
    OTEL_TRACES_SAMPLER_ARG: "",
    OTEL_LOGS_EXPORTER: "",
    OTEL_EXPORTER_OTLP_INSECURE: "",
    OTEL_EXPORTER_OTLP_TRACES_INSECURE: "",
    OTEL_EXPORTER_OTLP_METRICS_INSECURE: "",
    OTEL_EXPORTER_OTLP_LOGS_INSECURE: "",
    OTEL_EXPORTER_OTLP_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_LOGS_COMPRESSION: "",
    OTEL_EXPORTER_OTLP_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_KEY: "",
    OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_LOGS_CLIENT_CERTIFICATE: "",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_TRACES_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_LOGS_PROTOCOL: "http/protobuf",
    OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "cumulative"
  };
  function parseBoolean2(key, environment, values) {
    if (typeof values[key] === "undefined") {
      return;
    }
    var value = String(values[key]);
    environment[key] = value.toLowerCase() === "true";
  }
  function parseNumber2(name, environment, values, min, max) {
    if (min === void 0) {
      min = -Infinity;
    }
    if (max === void 0) {
      max = Infinity;
    }
    if (typeof values[name] !== "undefined") {
      var value = Number(values[name]);
      if (!isNaN(value)) {
        if (value < min) {
          environment[name] = min;
        } else if (value > max) {
          environment[name] = max;
        } else {
          environment[name] = value;
        }
      }
    }
  }
  function parseStringList2(name, output, input, separator) {
    if (separator === void 0) {
      separator = DEFAULT_LIST_SEPARATOR2;
    }
    var givenValue = input[name];
    if (typeof givenValue === "string") {
      output[name] = givenValue.split(separator).map(function(v) {
        return v.trim();
      });
    }
  }
  var logLevelMap2 = {
    ALL: DiagLogLevel.ALL,
    VERBOSE: DiagLogLevel.VERBOSE,
    DEBUG: DiagLogLevel.DEBUG,
    INFO: DiagLogLevel.INFO,
    WARN: DiagLogLevel.WARN,
    ERROR: DiagLogLevel.ERROR,
    NONE: DiagLogLevel.NONE
  };
  function setLogLevelFromEnv2(key, environment, values) {
    var value = values[key];
    if (typeof value === "string") {
      var theLevel = logLevelMap2[value.toUpperCase()];
      if (theLevel != null) {
        environment[key] = theLevel;
      }
    }
  }
  function parseEnvironment2(values) {
    var environment = {};
    for (var env in DEFAULT_ENVIRONMENT2) {
      var key = env;
      switch (key) {
        case "OTEL_LOG_LEVEL":
          setLogLevelFromEnv2(key, environment, values);
          break;
        default:
          if (isEnvVarABoolean2(key)) {
            parseBoolean2(key, environment, values);
          } else if (isEnvVarANumber2(key)) {
            parseNumber2(key, environment, values);
          } else if (isEnvVarAList2(key)) {
            parseStringList2(key, environment, values);
          } else {
            var value = values[key];
            if (typeof value !== "undefined" && value !== null) {
              environment[key] = String(value);
            }
          }
      }
    }
    return environment;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/globalThis.js
  var _globalThis2 = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/platform/browser/environment.js
  function getEnv2() {
    var globalEnv = parseEnvironment2(_globalThis2);
    return Object.assign({}, DEFAULT_ENVIRONMENT2, globalEnv);
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/hex-to-binary.js
  function intValue(charCode) {
    if (charCode >= 48 && charCode <= 57) {
      return charCode - 48;
    }
    if (charCode >= 97 && charCode <= 102) {
      return charCode - 87;
    }
    return charCode - 55;
  }
  function hexToBinary(hexStr) {
    var buf = new Uint8Array(hexStr.length / 2);
    var offset = 0;
    for (var i = 0; i < hexStr.length; i += 2) {
      var hi = intValue(hexStr.charCodeAt(i));
      var lo = intValue(hexStr.charCodeAt(i + 1));
      buf[offset++] = hi << 4 | lo;
    }
    return buf;
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/common/time.js
  var NANOSECOND_DIGITS2 = 9;
  var NANOSECOND_DIGITS_IN_MILLIS2 = 6;
  var MILLISECONDS_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS2);
  var SECOND_TO_NANOSECONDS2 = Math.pow(10, NANOSECOND_DIGITS2);
  function hrTimeToNanoseconds2(time) {
    return time[0] * SECOND_TO_NANOSECONDS2 + time[1];
  }

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/ExportResult.js
  var ExportResultCode2;
  (function(ExportResultCode3) {
    ExportResultCode3[ExportResultCode3["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode3[ExportResultCode3["FAILED"] = 1] = "FAILED";
  })(ExportResultCode2 || (ExportResultCode2 = {}));

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/promise.js
  var Deferred2 = (
    /** @class */
    (function() {
      function Deferred3() {
        var _this = this;
        this._promise = new Promise(function(resolve, reject) {
          _this._resolve = resolve;
          _this._reject = reject;
        });
      }
      Object.defineProperty(Deferred3.prototype, "promise", {
        get: function() {
          return this._promise;
        },
        enumerable: false,
        configurable: true
      });
      Deferred3.prototype.resolve = function(val) {
        this._resolve(val);
      };
      Deferred3.prototype.reject = function(err) {
        this._reject(err);
      };
      return Deferred3;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+core@1.25.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/core/build/esm/utils/callback.js
  var __read9 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var __spreadArray5 = function(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
  var BindOnceFuture2 = (
    /** @class */
    (function() {
      function BindOnceFuture3(_callback, _that) {
        this._callback = _callback;
        this._that = _that;
        this._isCalled = false;
        this._deferred = new Deferred2();
      }
      Object.defineProperty(BindOnceFuture3.prototype, "isCalled", {
        get: function() {
          return this._isCalled;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(BindOnceFuture3.prototype, "promise", {
        get: function() {
          return this._deferred.promise;
        },
        enumerable: false,
        configurable: true
      });
      BindOnceFuture3.prototype.call = function() {
        var _a2;
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        if (!this._isCalled) {
          this._isCalled = true;
          try {
            Promise.resolve((_a2 = this._callback).call.apply(_a2, __spreadArray5([this._that], __read9(args), false))).then(function(val) {
              return _this._deferred.resolve(val);
            }, function(err) {
              return _this._deferred.reject(err);
            });
          } catch (err) {
            this._deferred.reject(err);
          }
        }
        return this._deferred.promise;
      };
      return BindOnceFuture3;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+otlp-exporter-base@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-exporter-base/build/esm/util.js
  var __read10 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  var DEFAULT_TRACE_TIMEOUT = 1e4;
  var DEFAULT_EXPORT_MAX_ATTEMPTS = 5;
  var DEFAULT_EXPORT_INITIAL_BACKOFF = 1e3;
  var DEFAULT_EXPORT_MAX_BACKOFF = 5e3;
  var DEFAULT_EXPORT_BACKOFF_MULTIPLIER = 1.5;
  function parseHeaders(partialHeaders) {
    if (partialHeaders === void 0) {
      partialHeaders = {};
    }
    var headers = {};
    Object.entries(partialHeaders).forEach(function(_a2) {
      var _b = __read10(_a2, 2), key = _b[0], value = _b[1];
      if (typeof value !== "undefined") {
        headers[key] = String(value);
      } else {
        diag2.warn('Header "' + key + '" has invalid value (' + value + ") and will be ignored");
      }
    });
    return headers;
  }
  function appendResourcePathToUrl(url, path) {
    if (!url.endsWith("/")) {
      url = url + "/";
    }
    return url + path;
  }
  function appendRootPathToUrlIfNeeded(url) {
    try {
      var parsedUrl = new URL(url);
      if (parsedUrl.pathname === "") {
        parsedUrl.pathname = parsedUrl.pathname + "/";
      }
      return parsedUrl.toString();
    } catch (_a2) {
      diag2.warn("Could not parse export URL: '" + url + "'");
      return url;
    }
  }
  function configureExporterTimeout(timeoutMillis) {
    if (typeof timeoutMillis === "number") {
      if (timeoutMillis <= 0) {
        return invalidTimeout(timeoutMillis, DEFAULT_TRACE_TIMEOUT);
      }
      return timeoutMillis;
    } else {
      return getExporterTimeoutFromEnv();
    }
  }
  function getExporterTimeoutFromEnv() {
    var _a2;
    var definedTimeout = Number((_a2 = getEnv2().OTEL_EXPORTER_OTLP_TRACES_TIMEOUT) !== null && _a2 !== void 0 ? _a2 : getEnv2().OTEL_EXPORTER_OTLP_TIMEOUT);
    if (definedTimeout <= 0) {
      return invalidTimeout(definedTimeout, DEFAULT_TRACE_TIMEOUT);
    } else {
      return definedTimeout;
    }
  }
  function invalidTimeout(timeout, defaultTimeout) {
    diag2.warn("Timeout must be greater than 0", timeout);
    return defaultTimeout;
  }
  function isExportRetryable(statusCode) {
    var retryCodes = [429, 502, 503, 504];
    return retryCodes.includes(statusCode);
  }
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) {
      return -1;
    }
    var seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) {
      return seconds > 0 ? seconds * 1e3 : -1;
    }
    var delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) {
      return delay;
    }
    return 0;
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-exporter-base@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-exporter-base/build/esm/OTLPExporterBase.js
  var OTLPExporterBase = (
    /** @class */
    (function() {
      function OTLPExporterBase2(config) {
        if (config === void 0) {
          config = {};
        }
        this._sendingPromises = [];
        this.url = this.getDefaultUrl(config);
        if (typeof config.hostname === "string") {
          this.hostname = config.hostname;
        }
        this.shutdown = this.shutdown.bind(this);
        this._shutdownOnce = new BindOnceFuture2(this._shutdown, this);
        this._concurrencyLimit = typeof config.concurrencyLimit === "number" ? config.concurrencyLimit : 30;
        this.timeoutMillis = configureExporterTimeout(config.timeoutMillis);
        this.onInit(config);
      }
      OTLPExporterBase2.prototype.export = function(items, resultCallback) {
        if (this._shutdownOnce.isCalled) {
          resultCallback({
            code: ExportResultCode2.FAILED,
            error: new Error("Exporter has been shutdown")
          });
          return;
        }
        if (this._sendingPromises.length >= this._concurrencyLimit) {
          resultCallback({
            code: ExportResultCode2.FAILED,
            error: new Error("Concurrent export limit reached")
          });
          return;
        }
        this._export(items).then(function() {
          resultCallback({ code: ExportResultCode2.SUCCESS });
        }).catch(function(error) {
          resultCallback({ code: ExportResultCode2.FAILED, error });
        });
      };
      OTLPExporterBase2.prototype._export = function(items) {
        var _this = this;
        return new Promise(function(resolve, reject) {
          try {
            diag2.debug("items to be sent", items);
            _this.send(items, resolve, reject);
          } catch (e) {
            reject(e);
          }
        });
      };
      OTLPExporterBase2.prototype.shutdown = function() {
        return this._shutdownOnce.call();
      };
      OTLPExporterBase2.prototype.forceFlush = function() {
        return Promise.all(this._sendingPromises).then(function() {
        });
      };
      OTLPExporterBase2.prototype._shutdown = function() {
        diag2.debug("shutdown started");
        this.onShutdown();
        return this.forceFlush();
      };
      return OTLPExporterBase2;
    })()
  );

  // ../../node_modules/.pnpm/@opentelemetry+otlp-exporter-base@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-exporter-base/build/esm/types.js
  var __extends3 = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var OTLPExporterError = (
    /** @class */
    (function(_super) {
      __extends3(OTLPExporterError2, _super);
      function OTLPExporterError2(message, code, data) {
        var _this = _super.call(this, message) || this;
        _this.name = "OTLPExporterError";
        _this.data = data;
        _this.code = code;
        return _this;
      }
      return OTLPExporterError2;
    })(Error)
  );

  // ../../node_modules/.pnpm/@opentelemetry+otlp-exporter-base@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-exporter-base/build/esm/platform/browser/util.js
  var __assign3 = function() {
    __assign3 = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign3.apply(this, arguments);
  };
  var __read11 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function sendWithBeacon(body, url, blobPropertyBag, onSuccess, onError) {
    if (navigator.sendBeacon(url, new Blob([body], blobPropertyBag))) {
      diag2.debug("sendBeacon - can send", body);
      onSuccess();
    } else {
      var error = new OTLPExporterError("sendBeacon - cannot send " + body);
      onError(error);
    }
  }
  function sendWithXhr(body, url, headers, exporterTimeout, onSuccess, onError) {
    var retryTimer;
    var xhr;
    var reqIsDestroyed = false;
    var exporterTimer = setTimeout(function() {
      clearTimeout(retryTimer);
      reqIsDestroyed = true;
      if (xhr.readyState === XMLHttpRequest.DONE) {
        var err = new OTLPExporterError("Request Timeout");
        onError(err);
      } else {
        xhr.abort();
      }
    }, exporterTimeout);
    var sendWithRetry = function(retries, minDelay) {
      if (retries === void 0) {
        retries = DEFAULT_EXPORT_MAX_ATTEMPTS;
      }
      if (minDelay === void 0) {
        minDelay = DEFAULT_EXPORT_INITIAL_BACKOFF;
      }
      xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      var defaultHeaders = {
        Accept: "application/json",
        "Content-Type": "application/json"
      };
      Object.entries(__assign3(__assign3({}, defaultHeaders), headers)).forEach(function(_a2) {
        var _b = __read11(_a2, 2), k = _b[0], v = _b[1];
        xhr.setRequestHeader(k, v);
      });
      xhr.send(body);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE && reqIsDestroyed === false) {
          if (xhr.status >= 200 && xhr.status <= 299) {
            diag2.debug("xhr success", body);
            onSuccess();
            clearTimeout(exporterTimer);
            clearTimeout(retryTimer);
          } else if (xhr.status && isExportRetryable(xhr.status) && retries > 0) {
            var retryTime = void 0;
            minDelay = DEFAULT_EXPORT_BACKOFF_MULTIPLIER * minDelay;
            if (xhr.getResponseHeader("Retry-After")) {
              retryTime = parseRetryAfterToMills(xhr.getResponseHeader("Retry-After"));
            } else {
              retryTime = Math.round(Math.random() * (DEFAULT_EXPORT_MAX_BACKOFF - minDelay) + minDelay);
            }
            retryTimer = setTimeout(function() {
              sendWithRetry(retries - 1, minDelay);
            }, retryTime);
          } else {
            var error = new OTLPExporterError("Failed to export with XHR (status: " + xhr.status + ")", xhr.status);
            onError(error);
            clearTimeout(exporterTimer);
            clearTimeout(retryTimer);
          }
        }
      };
      xhr.onabort = function() {
        if (reqIsDestroyed) {
          var err = new OTLPExporterError("Request Timeout");
          onError(err);
        }
        clearTimeout(exporterTimer);
        clearTimeout(retryTimer);
      };
      xhr.onerror = function() {
        if (reqIsDestroyed) {
          var err = new OTLPExporterError("Request Timeout");
          onError(err);
        }
        clearTimeout(exporterTimer);
        clearTimeout(retryTimer);
      };
    };
    sendWithRetry();
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-exporter-base@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-exporter-base/build/esm/platform/browser/OTLPExporterBrowserBase.js
  var __extends4 = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var __assign4 = function() {
    __assign4 = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign4.apply(this, arguments);
  };
  var OTLPExporterBrowserBase = (
    /** @class */
    (function(_super) {
      __extends4(OTLPExporterBrowserBase2, _super);
      function OTLPExporterBrowserBase2(config, serializer, contentType) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, config) || this;
        _this._useXHR = false;
        _this._serializer = serializer;
        _this._contentType = contentType;
        _this._useXHR = !!config.headers || typeof navigator.sendBeacon !== "function";
        if (_this._useXHR) {
          _this._headers = Object.assign({}, parseHeaders(config.headers), utils_exports.parseKeyPairsIntoRecord(getEnv2().OTEL_EXPORTER_OTLP_HEADERS));
        } else {
          _this._headers = {};
        }
        return _this;
      }
      OTLPExporterBrowserBase2.prototype.onInit = function() {
      };
      OTLPExporterBrowserBase2.prototype.onShutdown = function() {
      };
      OTLPExporterBrowserBase2.prototype.send = function(items, onSuccess, onError) {
        var _this = this;
        var _a2;
        if (this._shutdownOnce.isCalled) {
          diag2.debug("Shutdown already started. Cannot send objects");
          return;
        }
        var body = (_a2 = this._serializer.serializeRequest(items)) !== null && _a2 !== void 0 ? _a2 : new Uint8Array();
        var promise = new Promise(function(resolve, reject) {
          if (_this._useXHR) {
            sendWithXhr(body, _this.url, __assign4(__assign4({}, _this._headers), { "Content-Type": _this._contentType }), _this.timeoutMillis, resolve, reject);
          } else {
            sendWithBeacon(body, _this.url, { type: _this._contentType }, resolve, reject);
          }
        }).then(onSuccess, onError);
        this._sendingPromises.push(promise);
        var popPromise = function() {
          var index = _this._sendingPromises.indexOf(promise);
          _this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
      };
      return OTLPExporterBrowserBase2;
    })(OTLPExporterBase)
  );

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/common/index.js
  function hrTimeToNanos(hrTime2) {
    var NANOSECONDS = BigInt(1e9);
    return BigInt(hrTime2[0]) * NANOSECONDS + BigInt(hrTime2[1]);
  }
  function toLongBits(value) {
    var low = Number(BigInt.asUintN(32, value));
    var high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return { low, high };
  }
  function encodeAsLongBits(hrTime2) {
    var nanos = hrTimeToNanos(hrTime2);
    return toLongBits(nanos);
  }
  function encodeAsString(hrTime2) {
    var nanos = hrTimeToNanos(hrTime2);
    return nanos.toString();
  }
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : hrTimeToNanoseconds2;
  function identity(value) {
    return value;
  }
  function optionalHexToBinary(str) {
    if (str === void 0)
      return void 0;
    return hexToBinary(str);
  }
  var DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary
  };
  function getOtlpEncoder(options) {
    var _a2, _b;
    if (options === void 0) {
      return DEFAULT_ENCODER;
    }
    var useLongBits = (_a2 = options.useLongBits) !== null && _a2 !== void 0 ? _a2 : true;
    var useHex = (_b = options.useHex) !== null && _b !== void 0 ? _b : false;
    return {
      encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
      encodeSpanContext: useHex ? identity : hexToBinary,
      encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/common/internal.js
  var __read12 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function createInstrumentationScope(scope) {
    return {
      name: scope.name,
      version: scope.version
    };
  }
  function toAttributes(attributes) {
    return Object.keys(attributes).map(function(key) {
      return toKeyValue(key, attributes[key]);
    });
  }
  function toKeyValue(key, value) {
    return {
      key,
      value: toAnyValue(value)
    };
  }
  function toAnyValue(value) {
    var t = typeof value;
    if (t === "string")
      return { stringValue: value };
    if (t === "number") {
      if (!Number.isInteger(value))
        return { doubleValue: value };
      return { intValue: value };
    }
    if (t === "boolean")
      return { boolValue: value };
    if (value instanceof Uint8Array)
      return { bytesValue: value };
    if (Array.isArray(value))
      return { arrayValue: { values: value.map(toAnyValue) } };
    if (t === "object" && value != null)
      return {
        kvlistValue: {
          values: Object.entries(value).map(function(_a2) {
            var _b = __read12(_a2, 2), k = _b[0], v = _b[1];
            return toKeyValue(k, v);
          })
        }
      };
    return {};
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/trace/internal.js
  function sdkSpanToOtlpSpan(span, encoder) {
    var _a2;
    var ctx = span.spanContext();
    var status = span.status;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId: encoder.encodeOptionalSpanContext(span.parentSpanId),
      traceState: (_a2 = ctx.traceState) === null || _a2 === void 0 ? void 0 : _a2.serialize(),
      name: span.name,
      // Span kind is offset by 1 because the API does not define a value for unset
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: toAttributes(span.attributes),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map(function(event) {
        return toOtlpSpanEvent(event, encoder);
      }),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        // API and proto enums share the same values
        code: status.code,
        message: status.message
      },
      links: span.links.map(function(link) {
        return toOtlpLink(link, encoder);
      }),
      droppedLinksCount: span.droppedLinksCount
    };
  }
  function toOtlpLink(link, encoder) {
    var _a2;
    return {
      attributes: link.attributes ? toAttributes(link.attributes) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: (_a2 = link.context.traceState) === null || _a2 === void 0 ? void 0 : _a2.serialize(),
      droppedAttributesCount: link.droppedAttributesCount || 0
    };
  }
  function toOtlpSpanEvent(timedEvent, encoder) {
    return {
      attributes: timedEvent.attributes ? toAttributes(timedEvent.attributes) : [],
      name: timedEvent.name,
      timeUnixNano: encoder.encodeHrTime(timedEvent.time),
      droppedAttributesCount: timedEvent.droppedAttributesCount || 0
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/resource/internal.js
  function createResource(resource) {
    return {
      attributes: toAttributes(resource.attributes),
      droppedAttributesCount: 0
    };
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/trace/index.js
  var __values5 = function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function() {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  };
  var __read13 = function(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
  function createExportTraceServiceRequest(spans, options) {
    var encoder = getOtlpEncoder(options);
    return {
      resourceSpans: spanRecordsToResourceSpans(spans, encoder)
    };
  }
  function createResourceMap(readableSpans) {
    var e_1, _a2;
    var resourceMap = /* @__PURE__ */ new Map();
    try {
      for (var readableSpans_1 = __values5(readableSpans), readableSpans_1_1 = readableSpans_1.next(); !readableSpans_1_1.done; readableSpans_1_1 = readableSpans_1.next()) {
        var record = readableSpans_1_1.value;
        var ilmMap = resourceMap.get(record.resource);
        if (!ilmMap) {
          ilmMap = /* @__PURE__ */ new Map();
          resourceMap.set(record.resource, ilmMap);
        }
        var instrumentationLibraryKey = record.instrumentationLibrary.name + "@" + (record.instrumentationLibrary.version || "") + ":" + (record.instrumentationLibrary.schemaUrl || "");
        var records = ilmMap.get(instrumentationLibraryKey);
        if (!records) {
          records = [];
          ilmMap.set(instrumentationLibraryKey, records);
        }
        records.push(record);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (readableSpans_1_1 && !readableSpans_1_1.done && (_a2 = readableSpans_1.return)) _a2.call(readableSpans_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    var resourceMap = createResourceMap(readableSpans);
    var out = [];
    var entryIterator = resourceMap.entries();
    var entry = entryIterator.next();
    while (!entry.done) {
      var _a2 = __read13(entry.value, 2), resource = _a2[0], ilmMap = _a2[1];
      var scopeResourceSpans = [];
      var ilmIterator = ilmMap.values();
      var ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        var scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          var spans = scopeSpans.map(function(readableSpan) {
            return sdkSpanToOtlpSpan(readableSpan, encoder);
          });
          scopeResourceSpans.push({
            scope: createInstrumentationScope(scopeSpans[0].instrumentationLibrary),
            spans,
            schemaUrl: scopeSpans[0].instrumentationLibrary.schemaUrl
          });
        }
        ilmEntry = ilmIterator.next();
      }
      var transformedSpans = {
        resource: createResource(resource),
        scopeSpans: scopeResourceSpans,
        schemaUrl: void 0
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }

  // ../../node_modules/.pnpm/@opentelemetry+otlp-transformer@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/otlp-transformer/build/esm/json/serializers.js
  var JsonTraceSerializer = {
    serializeRequest: function(arg) {
      var request = createExportTraceServiceRequest(arg, {
        useHex: true,
        useLongBits: false
      });
      var encoder = new TextEncoder();
      return encoder.encode(JSON.stringify(request));
    },
    deserializeResponse: function(arg) {
      var decoder = new TextDecoder();
      return JSON.parse(decoder.decode(arg));
    }
  };

  // ../../node_modules/.pnpm/@opentelemetry+exporter-trace-otlp-http@0.52.1_@opentelemetry+api@1.9.1/node_modules/@opentelemetry/exporter-trace-otlp-http/build/esm/platform/browser/OTLPTraceExporter.js
  var __extends5 = /* @__PURE__ */ (function() {
    var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    return function(d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
  })();
  var DEFAULT_COLLECTOR_RESOURCE_PATH = "v1/traces";
  var DEFAULT_COLLECTOR_URL = "http://localhost:4318/" + DEFAULT_COLLECTOR_RESOURCE_PATH;
  var OTLPTraceExporter = (
    /** @class */
    (function(_super) {
      __extends5(OTLPTraceExporter2, _super);
      function OTLPTraceExporter2(config) {
        if (config === void 0) {
          config = {};
        }
        var _this = _super.call(this, config, JsonTraceSerializer, "application/json") || this;
        _this._headers = Object.assign(_this._headers, utils_exports.parseKeyPairsIntoRecord(getEnv2().OTEL_EXPORTER_OTLP_TRACES_HEADERS));
        return _this;
      }
      OTLPTraceExporter2.prototype.getDefaultUrl = function(config) {
        return typeof config.url === "string" ? config.url : getEnv2().OTEL_EXPORTER_OTLP_TRACES_ENDPOINT.length > 0 ? appendRootPathToUrlIfNeeded(getEnv2().OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) : getEnv2().OTEL_EXPORTER_OTLP_ENDPOINT.length > 0 ? appendResourcePathToUrl(getEnv2().OTEL_EXPORTER_OTLP_ENDPOINT, DEFAULT_COLLECTOR_RESOURCE_PATH) : DEFAULT_COLLECTOR_URL;
      };
      return OTLPTraceExporter2;
    })(OTLPExporterBrowserBase)
  );

  // ../../node_modules/.pnpm/@opentelemetry+semantic-conventions@1.40.0/node_modules/@opentelemetry/semantic-conventions/build/esm/resource/SemanticResourceAttributes.js
  var TMP_SERVICE_NAME2 = "service.name";
  var SEMRESATTRS_SERVICE_NAME2 = TMP_SERVICE_NAME2;

  // src/tracer.ts
  var _tracer = null;
  var _initialized = false;
  function init(config) {
    if (_initialized) {
      console.warn("[FlowVibe] Already initialized. Call init() only once.");
      return;
    }
    const endpoint = config.endpoint ?? "http://localhost:4318";
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME2]: config.projectId,
      "flowvibe.project_id": config.projectId,
      "flowvibe.version": config.version ?? "unknown"
    });
    const exporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: {}
    });
    const provider = new WebTracerProvider({ resource });
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
    _tracer = trace.getTracer("flowvibe", "0.1.0");
    _initialized = true;
    if (config.debug) {
      console.log(`[FlowVibe] Initialized. Traces \u2192 ${endpoint}/v1/traces`);
    }
  }
  function getTracer() {
    if (!_tracer) {
      throw new Error("[FlowVibe] Not initialized. Call init() before using stage/branch.");
    }
    return _tracer;
  }
  function isInitialized() {
    return _initialized;
  }

  // src/decorators/stage.ts
  function stage(opts, fn) {
    const wrapped = function(...args) {
      const tracer = getTracer();
      const spanName = `stage.${opts.id}`;
      return tracer.startActiveSpan(
        spanName,
        { kind: SpanKind.INTERNAL },
        context.active(),
        (span) => {
          span.setAttributes({
            "flowvibe.stage_id": opts.id,
            "flowvibe.stage.name": opts.name,
            ...opts.businessMeaning ? { "flowvibe.stage.business_meaning": opts.businessMeaning } : {}
          });
          try {
            const result = fn.apply(this, args);
            if (result instanceof Promise) {
              return result.then((value) => {
                span.setStatus({ code: SpanStatusCode.OK });
                span.end();
                return value;
              }).catch((err) => {
                span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
                span.recordException(err);
                span.end();
                throw err;
              });
            }
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return result;
          } catch (err) {
            const error = err;
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.recordException(error);
            span.end();
            throw err;
          }
        }
      );
    };
    Object.defineProperty(wrapped, "name", { value: fn.name || opts.id });
    return wrapped;
  }

  // src/decorators/branch.ts
  function branch(opts, fn) {
    const wrapped = function(...args) {
      const tracer = getTracer();
      const spanName = `branch.${opts.id}`;
      return tracer.startActiveSpan(
        spanName,
        { kind: SpanKind.INTERNAL },
        context.active(),
        (span) => {
          span.setAttributes({
            "flowvibe.branch_id": opts.id,
            "flowvibe.branch.name": opts.name,
            "flowvibe.branch.trigger_type": opts.triggerType,
            ...opts.triggerExpression ? { "flowvibe.branch.trigger_expression": opts.triggerExpression } : {},
            ...opts.riskLevel ? { "flowvibe.branch.risk_level": opts.riskLevel } : {}
          });
          try {
            const result = fn.apply(this, args);
            const finalize = (triggered) => {
              span.setAttributes({ "flowvibe.branch.triggered": triggered });
              span.addEvent("branch.evaluated", {
                "flowvibe.branch_id": opts.id,
                "flowvibe.branch.triggered": triggered,
                "flowvibe.branch.trigger_expression": opts.triggerExpression ?? ""
              });
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return triggered;
            };
            if (result instanceof Promise) {
              return result.then(finalize).catch((err) => {
                span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
                span.recordException(err);
                span.end();
                throw err;
              });
            }
            return finalize(result);
          } catch (err) {
            const error = err;
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            span.recordException(error);
            span.end();
            throw err;
          }
        }
      );
    };
    Object.defineProperty(wrapped, "name", { value: fn.name || opts.id });
    return wrapped;
  }

  // src/index.ts
  var VERSION4 = "0.1.0";
  return __toCommonJS(index_exports);
})();
