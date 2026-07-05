var gd = Object.defineProperty;
var _i = (e) => {
  throw TypeError(e);
};
var _d = (e, t, r) => t in e ? gd(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var Kr = (e, t, r) => _d(e, typeof t != "symbol" ? t + "" : t, r), Ps = (e, t, r) => t.has(e) || _i("Cannot " + r);
var X = (e, t, r) => (Ps(e, t, "read from private field"), r ? r.call(e) : t.get(e)), He = (e, t, r) => t.has(e) ? _i("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), ke = (e, t, r, n) => (Ps(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), lt = (e, t, r) => (Ps(e, t, "access private method"), r);
import Wc, { ipcMain as Yc, app as Yn, BrowserWindow as Qc } from "electron";
import { fileURLToPath as vd } from "node:url";
import x from "node:path";
import ue from "node:process";
import { promisify as be, isDeepStrictEqual as vi } from "node:util";
import J from "node:fs";
import Gr from "node:crypto";
import wi from "node:assert";
import Zc from "node:os";
import "node:events";
import "node:stream";
const or = (e) => {
  const t = typeof e;
  return e !== null && (t === "object" || t === "function");
}, xc = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]), el = 1e6, wd = (e) => e >= "0" && e <= "9";
function tl(e) {
  if (e === "0")
    return !0;
  if (/^[1-9]\d*$/.test(e)) {
    const t = Number.parseInt(e, 10);
    return t <= Number.MAX_SAFE_INTEGER && t <= el;
  }
  return !1;
}
function Ns(e, t) {
  return xc.has(e) ? !1 : (e && tl(e) ? t.push(Number.parseInt(e, 10)) : t.push(e), !0);
}
function Ed(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected a string, got ${typeof e}`);
  const t = [];
  let r = "", n = "start", s = !1, a = 0;
  for (const o of e) {
    if (a++, s) {
      r += o, s = !1;
      continue;
    }
    if (o === "\\") {
      if (n === "index")
        throw new Error(`Invalid character '${o}' in an index at position ${a}`);
      if (n === "indexEnd")
        throw new Error(`Invalid character '${o}' after an index at position ${a}`);
      s = !0, n = n === "start" ? "property" : n;
      continue;
    }
    switch (o) {
      case ".": {
        if (n === "index")
          throw new Error(`Invalid character '${o}' in an index at position ${a}`);
        if (n === "indexEnd") {
          n = "property";
          break;
        }
        if (!Ns(r, t))
          return [];
        r = "", n = "property";
        break;
      }
      case "[": {
        if (n === "index")
          throw new Error(`Invalid character '${o}' in an index at position ${a}`);
        if (n === "indexEnd") {
          n = "index";
          break;
        }
        if (n === "property" || n === "start") {
          if ((r || n === "property") && !Ns(r, t))
            return [];
          r = "";
        }
        n = "index";
        break;
      }
      case "]": {
        if (n === "index") {
          if (r === "")
            r = (t.pop() || "") + "[]", n = "property";
          else {
            const u = Number.parseInt(r, 10);
            !Number.isNaN(u) && Number.isFinite(u) && u >= 0 && u <= Number.MAX_SAFE_INTEGER && u <= el && r === String(u) ? t.push(u) : t.push(r), r = "", n = "indexEnd";
          }
          break;
        }
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        r += o;
        break;
      }
      default: {
        if (n === "index" && !wd(o))
          throw new Error(`Invalid character '${o}' in an index at position ${a}`);
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        n === "start" && (n = "property"), r += o;
      }
    }
  }
  switch (s && (r += "\\"), n) {
    case "property": {
      if (!Ns(r, t))
        return [];
      break;
    }
    case "index":
      throw new Error("Index was not closed");
    case "start": {
      t.push("");
      break;
    }
  }
  return t;
}
function os(e) {
  if (typeof e == "string")
    return Ed(e);
  if (Array.isArray(e)) {
    const t = [];
    for (const [r, n] of e.entries()) {
      if (typeof n != "string" && typeof n != "number")
        throw new TypeError(`Expected a string or number for path segment at index ${r}, got ${typeof n}`);
      if (typeof n == "number" && !Number.isFinite(n))
        throw new TypeError(`Path segment at index ${r} must be a finite number, got ${n}`);
      if (xc.has(n))
        return [];
      typeof n == "string" && tl(n) ? t.push(Number.parseInt(n, 10)) : t.push(n);
    }
    return t;
  }
  return [];
}
function Ei(e, t, r) {
  if (!or(e) || typeof t != "string" && !Array.isArray(t))
    return r === void 0 ? e : r;
  const n = os(t);
  if (n.length === 0)
    return r;
  for (let s = 0; s < n.length; s++) {
    const a = n[s];
    if (e = e[a], e == null) {
      if (s !== n.length - 1)
        return r;
      break;
    }
  }
  return e === void 0 ? r : e;
}
function _n(e, t, r) {
  if (!or(e) || typeof t != "string" && !Array.isArray(t))
    return e;
  const n = e, s = os(t);
  if (s.length === 0)
    return e;
  for (let a = 0; a < s.length; a++) {
    const o = s[a];
    if (a === s.length - 1)
      e[o] = r;
    else if (!or(e[o])) {
      const c = typeof s[a + 1] == "number";
      e[o] = c ? [] : {};
    }
    e = e[o];
  }
  return n;
}
function bd(e, t) {
  if (!or(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = os(t);
  if (r.length === 0)
    return !1;
  for (let n = 0; n < r.length; n++) {
    const s = r[n];
    if (n === r.length - 1)
      return Object.hasOwn(e, s) ? (delete e[s], !0) : !1;
    if (e = e[s], !or(e))
      return !1;
  }
}
function Rs(e, t) {
  if (!or(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = os(t);
  if (r.length === 0)
    return !1;
  for (const n of r) {
    if (!or(e) || !(n in e))
      return !1;
    e = e[n];
  }
  return !0;
}
const Rt = Zc.homedir(), ya = Zc.tmpdir(), { env: _r } = ue, Sd = (e) => {
  const t = x.join(Rt, "Library");
  return {
    data: x.join(t, "Application Support", e),
    config: x.join(t, "Preferences", e),
    cache: x.join(t, "Caches", e),
    log: x.join(t, "Logs", e),
    temp: x.join(ya, e)
  };
}, Pd = (e) => {
  const t = _r.APPDATA || x.join(Rt, "AppData", "Roaming"), r = _r.LOCALAPPDATA || x.join(Rt, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: x.join(r, e, "Data"),
    config: x.join(t, e, "Config"),
    cache: x.join(r, e, "Cache"),
    log: x.join(r, e, "Log"),
    temp: x.join(ya, e)
  };
}, Nd = (e) => {
  const t = x.basename(Rt);
  return {
    data: x.join(_r.XDG_DATA_HOME || x.join(Rt, ".local", "share"), e),
    config: x.join(_r.XDG_CONFIG_HOME || x.join(Rt, ".config"), e),
    cache: x.join(_r.XDG_CACHE_HOME || x.join(Rt, ".cache"), e),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: x.join(_r.XDG_STATE_HOME || x.join(Rt, ".local", "state"), e),
    temp: x.join(ya, t, e)
  };
};
function Rd(e, { suffix: t = "nodejs" } = {}) {
  if (typeof e != "string")
    throw new TypeError(`Expected a string, got ${typeof e}`);
  return t && (e += `-${t}`), ue.platform === "darwin" ? Sd(e) : ue.platform === "win32" ? Pd(e) : Nd(e);
}
const yt = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    return e.apply(void 0, s).catch(r);
  };
}, ut = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    try {
      return e.apply(void 0, s);
    } catch (a) {
      return r(a);
    }
  };
}, Od = 250, gt = (e, t) => {
  const { isRetriable: r } = t;
  return function(s) {
    const { timeout: a } = s, o = s.interval ?? Od, u = Date.now() + a;
    return function c(...d) {
      return e.apply(void 0, d).catch((l) => {
        if (!r(l) || Date.now() >= u)
          throw l;
        const h = Math.round(o * Math.random());
        return h > 0 ? new Promise((g) => setTimeout(g, h)).then(() => c.apply(void 0, d)) : c.apply(void 0, d);
      });
    };
  };
}, _t = (e, t) => {
  const { isRetriable: r } = t;
  return function(s) {
    const { timeout: a } = s, o = Date.now() + a;
    return function(...c) {
      for (; ; )
        try {
          return e.apply(void 0, c);
        } catch (d) {
          if (!r(d) || Date.now() >= o)
            throw d;
          continue;
        }
    };
  };
}, vr = {
  /* API */
  isChangeErrorOk: (e) => {
    if (!vr.isNodeError(e))
      return !1;
    const { code: t } = e;
    return t === "ENOSYS" || !Id && (t === "EINVAL" || t === "EPERM");
  },
  isNodeError: (e) => e instanceof Error,
  isRetriableError: (e) => {
    if (!vr.isNodeError(e))
      return !1;
    const { code: t } = e;
    return t === "EMFILE" || t === "ENFILE" || t === "EAGAIN" || t === "EBUSY" || t === "EACCESS" || t === "EACCES" || t === "EACCS" || t === "EPERM";
  },
  onChangeError: (e) => {
    if (!vr.isNodeError(e))
      throw e;
    if (!vr.isChangeErrorOk(e))
      throw e;
  }
}, vn = {
  onError: vr.onChangeError
}, Fe = {
  onError: () => {
  }
}, Id = ue.getuid ? !ue.getuid() : !1, Se = {
  isRetriable: vr.isRetriableError
}, Re = {
  attempt: {
    /* ASYNC */
    chmod: yt(be(J.chmod), vn),
    chown: yt(be(J.chown), vn),
    close: yt(be(J.close), Fe),
    fsync: yt(be(J.fsync), Fe),
    mkdir: yt(be(J.mkdir), Fe),
    realpath: yt(be(J.realpath), Fe),
    stat: yt(be(J.stat), Fe),
    unlink: yt(be(J.unlink), Fe),
    /* SYNC */
    chmodSync: ut(J.chmodSync, vn),
    chownSync: ut(J.chownSync, vn),
    closeSync: ut(J.closeSync, Fe),
    existsSync: ut(J.existsSync, Fe),
    fsyncSync: ut(J.fsync, Fe),
    mkdirSync: ut(J.mkdirSync, Fe),
    realpathSync: ut(J.realpathSync, Fe),
    statSync: ut(J.statSync, Fe),
    unlinkSync: ut(J.unlinkSync, Fe)
  },
  retry: {
    /* ASYNC */
    close: gt(be(J.close), Se),
    fsync: gt(be(J.fsync), Se),
    open: gt(be(J.open), Se),
    readFile: gt(be(J.readFile), Se),
    rename: gt(be(J.rename), Se),
    stat: gt(be(J.stat), Se),
    write: gt(be(J.write), Se),
    writeFile: gt(be(J.writeFile), Se),
    /* SYNC */
    closeSync: _t(J.closeSync, Se),
    fsyncSync: _t(J.fsyncSync, Se),
    openSync: _t(J.openSync, Se),
    readFileSync: _t(J.readFileSync, Se),
    renameSync: _t(J.renameSync, Se),
    statSync: _t(J.statSync, Se),
    writeSync: _t(J.writeSync, Se),
    writeFileSync: _t(J.writeFileSync, Se)
  }
}, Td = "utf8", bi = 438, jd = 511, Ad = {}, kd = ue.geteuid ? ue.geteuid() : -1, Cd = ue.getegid ? ue.getegid() : -1, Dd = 1e3, Md = !!ue.getuid;
ue.getuid && ue.getuid();
const Si = 128, Ld = (e) => e instanceof Error && "code" in e, Pi = (e) => typeof e == "string", Os = (e) => e === void 0, Vd = ue.platform === "linux", rl = ue.platform === "win32", ga = ["SIGHUP", "SIGINT", "SIGTERM"];
rl || ga.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
Vd && ga.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
class Fd {
  /* CONSTRUCTOR */
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set(), this.exited = !1, this.exit = (t) => {
      if (!this.exited) {
        this.exited = !0;
        for (const r of this.callbacks)
          r();
        t && (rl && t !== "SIGINT" && t !== "SIGTERM" && t !== "SIGKILL" ? ue.kill(ue.pid, "SIGTERM") : ue.kill(ue.pid, t));
      }
    }, this.hook = () => {
      ue.once("exit", () => this.exit());
      for (const t of ga)
        try {
          ue.once(t, () => this.exit(t));
        } catch {
        }
    }, this.register = (t) => (this.callbacks.add(t), () => {
      this.callbacks.delete(t);
    }), this.hook();
  }
}
const zd = new Fd(), Ud = zd.register, Oe = {
  /* VARIABLES */
  store: {},
  // filePath => purge
  /* API */
  create: (e) => {
    const t = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6), s = `.tmp-${Date.now().toString().slice(-10)}${t}`;
    return `${e}${s}`;
  },
  get: (e, t, r = !0) => {
    const n = Oe.truncate(t(e));
    return n in Oe.store ? Oe.get(e, t, r) : (Oe.store[n] = r, [n, () => delete Oe.store[n]]);
  },
  purge: (e) => {
    Oe.store[e] && (delete Oe.store[e], Re.attempt.unlink(e));
  },
  purgeSync: (e) => {
    Oe.store[e] && (delete Oe.store[e], Re.attempt.unlinkSync(e));
  },
  purgeSyncAll: () => {
    for (const e in Oe.store)
      Oe.purgeSync(e);
  },
  truncate: (e) => {
    const t = x.basename(e);
    if (t.length <= Si)
      return e;
    const r = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(t);
    if (!r)
      return e;
    const n = t.length - Si;
    return `${e.slice(0, -t.length)}${r[1]}${r[2].slice(0, -n)}${r[3]}`;
  }
};
Ud(Oe.purgeSyncAll);
function nl(e, t, r = Ad) {
  if (Pi(r))
    return nl(e, t, { encoding: r });
  const s = { timeout: r.timeout ?? Dd };
  let a = null, o = null, u = null;
  try {
    const c = Re.attempt.realpathSync(e), d = !!c;
    e = c || e, [o, a] = Oe.get(e, r.tmpCreate || Oe.create, r.tmpPurge !== !1);
    const l = Md && Os(r.chown), h = Os(r.mode);
    if (d && (l || h)) {
      const S = Re.attempt.statSync(e);
      S && (r = { ...r }, l && (r.chown = { uid: S.uid, gid: S.gid }), h && (r.mode = S.mode));
    }
    if (!d) {
      const S = x.dirname(e);
      Re.attempt.mkdirSync(S, {
        mode: jd,
        recursive: !0
      });
    }
    u = Re.retry.openSync(s)(o, "w", r.mode || bi), r.tmpCreated && r.tmpCreated(o), Pi(t) ? Re.retry.writeSync(s)(u, t, 0, r.encoding || Td) : Os(t) || Re.retry.writeSync(s)(u, t, 0, t.length, 0), r.fsync !== !1 && (r.fsyncWait !== !1 ? Re.retry.fsyncSync(s)(u) : Re.attempt.fsync(u)), Re.retry.closeSync(s)(u), u = null, r.chown && (r.chown.uid !== kd || r.chown.gid !== Cd) && Re.attempt.chownSync(o, r.chown.uid, r.chown.gid), r.mode && r.mode !== bi && Re.attempt.chmodSync(o, r.mode);
    try {
      Re.retry.renameSync(s)(o, e);
    } catch (S) {
      if (!Ld(S) || S.code !== "ENAMETOOLONG")
        throw S;
      Re.retry.renameSync(s)(o, Oe.truncate(e));
    }
    a(), o = null;
  } finally {
    u && Re.attempt.closeSync(u), o && Oe.purge(o);
  }
}
function sl(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Ys = { exports: {} }, al = {}, Ze = {}, Or = {}, fn = {}, W = {}, un = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
  class t {
  }
  e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends t {
    constructor(v) {
      if (super(), !e.IDENTIFIER.test(v))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = v;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  e.Name = r;
  class n extends t {
    constructor(v) {
      super(), this._items = typeof v == "string" ? [v] : v;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const v = this._items[0];
      return v === "" || v === '""';
    }
    get str() {
      var v;
      return (v = this._str) !== null && v !== void 0 ? v : this._str = this._items.reduce((N, R) => `${N}${R}`, "");
    }
    get names() {
      var v;
      return (v = this._names) !== null && v !== void 0 ? v : this._names = this._items.reduce((N, R) => (R instanceof r && (N[R.str] = (N[R.str] || 0) + 1), N), {});
    }
  }
  e._Code = n, e.nil = new n("");
  function s(m, ...v) {
    const N = [m[0]];
    let R = 0;
    for (; R < v.length; )
      u(N, v[R]), N.push(m[++R]);
    return new n(N);
  }
  e._ = s;
  const a = new n("+");
  function o(m, ...v) {
    const N = [g(m[0])];
    let R = 0;
    for (; R < v.length; )
      N.push(a), u(N, v[R]), N.push(a, g(m[++R]));
    return c(N), new n(N);
  }
  e.str = o;
  function u(m, v) {
    v instanceof n ? m.push(...v._items) : v instanceof r ? m.push(v) : m.push(h(v));
  }
  e.addCodeArg = u;
  function c(m) {
    let v = 1;
    for (; v < m.length - 1; ) {
      if (m[v] === a) {
        const N = d(m[v - 1], m[v + 1]);
        if (N !== void 0) {
          m.splice(v - 1, 3, N);
          continue;
        }
        m[v++] = "+";
      }
      v++;
    }
  }
  function d(m, v) {
    if (v === '""')
      return m;
    if (m === '""')
      return v;
    if (typeof m == "string")
      return v instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof v != "string" ? `${m.slice(0, -1)}${v}"` : v[0] === '"' ? m.slice(0, -1) + v.slice(1) : void 0;
    if (typeof v == "string" && v[0] === '"' && !(m instanceof r))
      return `"${m}${v.slice(1)}`;
  }
  function l(m, v) {
    return v.emptyStr() ? m : m.emptyStr() ? v : o`${m}${v}`;
  }
  e.strConcat = l;
  function h(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : g(Array.isArray(m) ? m.join(",") : m);
  }
  function S(m) {
    return new n(g(m));
  }
  e.stringify = S;
  function g(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  e.safeStringify = g;
  function w(m) {
    return typeof m == "string" && e.IDENTIFIER.test(m) ? new n(`.${m}`) : s`[${m}]`;
  }
  e.getProperty = w;
  function _(m) {
    if (typeof m == "string" && e.IDENTIFIER.test(m))
      return new n(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  e.getEsmExportName = _;
  function y(m) {
    return new n(m.toString());
  }
  e.regexpCode = y;
})(un);
var Qs = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = un;
  class r extends Error {
    constructor(d) {
      super(`CodeGen: "code" for ${d} not defined`), this.value = d.value;
    }
  }
  var n;
  (function(c) {
    c[c.Started = 0] = "Started", c[c.Completed = 1] = "Completed";
  })(n || (e.UsedValueState = n = {})), e.varKinds = {
    const: new t.Name("const"),
    let: new t.Name("let"),
    var: new t.Name("var")
  };
  class s {
    constructor({ prefixes: d, parent: l } = {}) {
      this._names = {}, this._prefixes = d, this._parent = l;
    }
    toName(d) {
      return d instanceof t.Name ? d : this.name(d);
    }
    name(d) {
      return new t.Name(this._newName(d));
    }
    _newName(d) {
      const l = this._names[d] || this._nameGroup(d);
      return `${d}${l.index++}`;
    }
    _nameGroup(d) {
      var l, h;
      if (!((h = (l = this._parent) === null || l === void 0 ? void 0 : l._prefixes) === null || h === void 0) && h.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  e.Scope = s;
  class a extends t.Name {
    constructor(d, l) {
      super(l), this.prefix = d;
    }
    setValue(d, { property: l, itemIndex: h }) {
      this.value = d, this.scopePath = (0, t._)`.${new t.Name(l)}[${h}]`;
    }
  }
  e.ValueScopeName = a;
  const o = (0, t._)`\n`;
  class u extends s {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? o : t.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new a(d, this._newName(d));
    }
    value(d, l) {
      var h;
      if (l.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const S = this.toName(d), { prefix: g } = S, w = (h = l.key) !== null && h !== void 0 ? h : l.ref;
      let _ = this._values[g];
      if (_) {
        const v = _.get(w);
        if (v)
          return v;
      } else
        _ = this._values[g] = /* @__PURE__ */ new Map();
      _.set(w, S);
      const y = this._scope[g] || (this._scope[g] = []), m = y.length;
      return y[m] = l.ref, S.setValue(l, { property: g, itemIndex: m }), S;
    }
    getValue(d, l) {
      const h = this._values[d];
      if (h)
        return h.get(l);
    }
    scopeRefs(d, l = this._values) {
      return this._reduceValues(l, (h) => {
        if (h.scopePath === void 0)
          throw new Error(`CodeGen: name "${h}" has no value`);
        return (0, t._)`${d}${h.scopePath}`;
      });
    }
    scopeCode(d = this._values, l, h) {
      return this._reduceValues(d, (S) => {
        if (S.value === void 0)
          throw new Error(`CodeGen: name "${S}" has no value`);
        return S.value.code;
      }, l, h);
    }
    _reduceValues(d, l, h = {}, S) {
      let g = t.nil;
      for (const w in d) {
        const _ = d[w];
        if (!_)
          continue;
        const y = h[w] = h[w] || /* @__PURE__ */ new Map();
        _.forEach((m) => {
          if (y.has(m))
            return;
          y.set(m, n.Started);
          let v = l(m);
          if (v) {
            const N = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
            g = (0, t._)`${g}${N} ${m} = ${v};${this.opts._n}`;
          } else if (v = S == null ? void 0 : S(m))
            g = (0, t._)`${g}${v}${this.opts._n}`;
          else
            throw new r(m);
          y.set(m, n.Completed);
        });
      }
      return g;
    }
  }
  e.ValueScope = u;
})(Qs);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = un, r = Qs;
  var n = un;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return n._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return n.str;
  } }), Object.defineProperty(e, "strConcat", { enumerable: !0, get: function() {
    return n.strConcat;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return n.nil;
  } }), Object.defineProperty(e, "getProperty", { enumerable: !0, get: function() {
    return n.getProperty;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return n.stringify;
  } }), Object.defineProperty(e, "regexpCode", { enumerable: !0, get: function() {
    return n.regexpCode;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return n.Name;
  } });
  var s = Qs;
  Object.defineProperty(e, "Scope", { enumerable: !0, get: function() {
    return s.Scope;
  } }), Object.defineProperty(e, "ValueScope", { enumerable: !0, get: function() {
    return s.ValueScope;
  } }), Object.defineProperty(e, "ValueScopeName", { enumerable: !0, get: function() {
    return s.ValueScopeName;
  } }), Object.defineProperty(e, "varKinds", { enumerable: !0, get: function() {
    return s.varKinds;
  } }), e.operators = {
    GT: new t._Code(">"),
    GTE: new t._Code(">="),
    LT: new t._Code("<"),
    LTE: new t._Code("<="),
    EQ: new t._Code("==="),
    NEQ: new t._Code("!=="),
    NOT: new t._Code("!"),
    OR: new t._Code("||"),
    AND: new t._Code("&&"),
    ADD: new t._Code("+")
  };
  class a {
    optimizeNodes() {
      return this;
    }
    optimizeNames(i, f) {
      return this;
    }
  }
  class o extends a {
    constructor(i, f, E) {
      super(), this.varKind = i, this.name = f, this.rhs = E;
    }
    render({ es5: i, _n: f }) {
      const E = i ? r.varKinds.var : this.varKind, T = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${E} ${this.name}${T};` + f;
    }
    optimizeNames(i, f) {
      if (i[this.name.str])
        return this.rhs && (this.rhs = K(this.rhs, i, f)), this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class u extends a {
    constructor(i, f, E) {
      super(), this.lhs = i, this.rhs = f, this.sideEffects = E;
    }
    render({ _n: i }) {
      return `${this.lhs} = ${this.rhs};` + i;
    }
    optimizeNames(i, f) {
      if (!(this.lhs instanceof t.Name && !i[this.lhs.str] && !this.sideEffects))
        return this.rhs = K(this.rhs, i, f), this;
    }
    get names() {
      const i = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return ne(i, this.rhs);
    }
  }
  class c extends u {
    constructor(i, f, E, T) {
      super(i, E, T), this.op = f;
    }
    render({ _n: i }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + i;
    }
  }
  class d extends a {
    constructor(i) {
      super(), this.label = i, this.names = {};
    }
    render({ _n: i }) {
      return `${this.label}:` + i;
    }
  }
  class l extends a {
    constructor(i) {
      super(), this.label = i, this.names = {};
    }
    render({ _n: i }) {
      return `break${this.label ? ` ${this.label}` : ""};` + i;
    }
  }
  class h extends a {
    constructor(i) {
      super(), this.error = i;
    }
    render({ _n: i }) {
      return `throw ${this.error};` + i;
    }
    get names() {
      return this.error.names;
    }
  }
  class S extends a {
    constructor(i) {
      super(), this.code = i;
    }
    render({ _n: i }) {
      return `${this.code};` + i;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(i, f) {
      return this.code = K(this.code, i, f), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class g extends a {
    constructor(i = []) {
      super(), this.nodes = i;
    }
    render(i) {
      return this.nodes.reduce((f, E) => f + E.render(i), "");
    }
    optimizeNodes() {
      const { nodes: i } = this;
      let f = i.length;
      for (; f--; ) {
        const E = i[f].optimizeNodes();
        Array.isArray(E) ? i.splice(f, 1, ...E) : E ? i[f] = E : i.splice(f, 1);
      }
      return i.length > 0 ? this : void 0;
    }
    optimizeNames(i, f) {
      const { nodes: E } = this;
      let T = E.length;
      for (; T--; ) {
        const I = E[T];
        I.optimizeNames(i, f) || (oe(i, I.names), E.splice(T, 1));
      }
      return E.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((i, f) => q(i, f.names), {});
    }
  }
  class w extends g {
    render(i) {
      return "{" + i._n + super.render(i) + "}" + i._n;
    }
  }
  class _ extends g {
  }
  class y extends w {
  }
  y.kind = "else";
  class m extends w {
    constructor(i, f) {
      super(f), this.condition = i;
    }
    render(i) {
      let f = `if(${this.condition})` + super.render(i);
      return this.else && (f += "else " + this.else.render(i)), f;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const i = this.condition;
      if (i === !0)
        return this.nodes;
      let f = this.else;
      if (f) {
        const E = f.optimizeNodes();
        f = this.else = Array.isArray(E) ? new y(E) : E;
      }
      if (f)
        return i === !1 ? f instanceof m ? f : f.nodes : this.nodes.length ? this : new m(Ee(i), f instanceof m ? [f] : f.nodes);
      if (!(i === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(i, f) {
      var E;
      if (this.else = (E = this.else) === null || E === void 0 ? void 0 : E.optimizeNames(i, f), !!(super.optimizeNames(i, f) || this.else))
        return this.condition = K(this.condition, i, f), this;
    }
    get names() {
      const i = super.names;
      return ne(i, this.condition), this.else && q(i, this.else.names), i;
    }
  }
  m.kind = "if";
  class v extends w {
  }
  v.kind = "for";
  class N extends v {
    constructor(i) {
      super(), this.iteration = i;
    }
    render(i) {
      return `for(${this.iteration})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iteration = K(this.iteration, i, f), this;
    }
    get names() {
      return q(super.names, this.iteration.names);
    }
  }
  class R extends v {
    constructor(i, f, E, T) {
      super(), this.varKind = i, this.name = f, this.from = E, this.to = T;
    }
    render(i) {
      const f = i.es5 ? r.varKinds.var : this.varKind, { name: E, from: T, to: I } = this;
      return `for(${f} ${E}=${T}; ${E}<${I}; ${E}++)` + super.render(i);
    }
    get names() {
      const i = ne(super.names, this.from);
      return ne(i, this.to);
    }
  }
  class O extends v {
    constructor(i, f, E, T) {
      super(), this.loop = i, this.varKind = f, this.name = E, this.iterable = T;
    }
    render(i) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iterable = K(this.iterable, i, f), this;
    }
    get names() {
      return q(super.names, this.iterable.names);
    }
  }
  class U extends w {
    constructor(i, f, E) {
      super(), this.name = i, this.args = f, this.async = E;
    }
    render(i) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(i);
    }
  }
  U.kind = "func";
  class B extends g {
    render(i) {
      return "return " + super.render(i);
    }
  }
  B.kind = "return";
  class le extends w {
    render(i) {
      let f = "try" + super.render(i);
      return this.catch && (f += this.catch.render(i)), this.finally && (f += this.finally.render(i)), f;
    }
    optimizeNodes() {
      var i, f;
      return super.optimizeNodes(), (i = this.catch) === null || i === void 0 || i.optimizeNodes(), (f = this.finally) === null || f === void 0 || f.optimizeNodes(), this;
    }
    optimizeNames(i, f) {
      var E, T;
      return super.optimizeNames(i, f), (E = this.catch) === null || E === void 0 || E.optimizeNames(i, f), (T = this.finally) === null || T === void 0 || T.optimizeNames(i, f), this;
    }
    get names() {
      const i = super.names;
      return this.catch && q(i, this.catch.names), this.finally && q(i, this.finally.names), i;
    }
  }
  class de extends w {
    constructor(i) {
      super(), this.error = i;
    }
    render(i) {
      return `catch(${this.error})` + super.render(i);
    }
  }
  de.kind = "catch";
  class me extends w {
    render(i) {
      return "finally" + super.render(i);
    }
  }
  me.kind = "finally";
  class V {
    constructor(i, f = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...f, _n: f.lines ? `
` : "" }, this._extScope = i, this._scope = new r.Scope({ parent: i }), this._nodes = [new _()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(i) {
      return this._scope.name(i);
    }
    // reserves unique name in the external scope
    scopeName(i) {
      return this._extScope.name(i);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(i, f) {
      const E = this._extScope.value(i, f);
      return (this._values[E.prefix] || (this._values[E.prefix] = /* @__PURE__ */ new Set())).add(E), E;
    }
    getScopeValue(i, f) {
      return this._extScope.getValue(i, f);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(i) {
      return this._extScope.scopeRefs(i, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(i, f, E, T) {
      const I = this._scope.toName(f);
      return E !== void 0 && T && (this._constants[I.str] = E), this._leafNode(new o(i, I, E)), I;
    }
    // `const` declaration (`var` in es5 mode)
    const(i, f, E) {
      return this._def(r.varKinds.const, i, f, E);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(i, f, E) {
      return this._def(r.varKinds.let, i, f, E);
    }
    // `var` declaration with optional assignment
    var(i, f, E) {
      return this._def(r.varKinds.var, i, f, E);
    }
    // assignment code
    assign(i, f, E) {
      return this._leafNode(new u(i, f, E));
    }
    // `+=` code
    add(i, f) {
      return this._leafNode(new c(i, e.operators.ADD, f));
    }
    // appends passed SafeExpr to code or executes Block
    code(i) {
      return typeof i == "function" ? i() : i !== t.nil && this._leafNode(new S(i)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...i) {
      const f = ["{"];
      for (const [E, T] of i)
        f.length > 1 && f.push(","), f.push(E), (E !== T || this.opts.es5) && (f.push(":"), (0, t.addCodeArg)(f, T));
      return f.push("}"), new t._Code(f);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(i, f, E) {
      if (this._blockNode(new m(i)), f && E)
        this.code(f).else().code(E).endIf();
      else if (f)
        this.code(f).endIf();
      else if (E)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(i) {
      return this._elseNode(new m(i));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new y());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, y);
    }
    _for(i, f) {
      return this._blockNode(i), f && this.code(f).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(i, f) {
      return this._for(new N(i), f);
    }
    // `for` statement for a range of values
    forRange(i, f, E, T, I = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const D = this._scope.toName(i);
      return this._for(new R(I, D, f, E), () => T(D));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(i, f, E, T = r.varKinds.const) {
      const I = this._scope.toName(i);
      if (this.opts.es5) {
        const D = f instanceof t.Name ? f : this.var("_arr", f);
        return this.forRange("_i", 0, (0, t._)`${D}.length`, (L) => {
          this.var(I, (0, t._)`${D}[${L}]`), E(I);
        });
      }
      return this._for(new O("of", T, I, f), () => E(I));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(i, f, E, T = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(i, (0, t._)`Object.keys(${f})`, E);
      const I = this._scope.toName(i);
      return this._for(new O("in", T, I, f), () => E(I));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(v);
    }
    // `label` statement
    label(i) {
      return this._leafNode(new d(i));
    }
    // `break` statement
    break(i) {
      return this._leafNode(new l(i));
    }
    // `return` statement
    return(i) {
      const f = new B();
      if (this._blockNode(f), this.code(i), f.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(B);
    }
    // `try` statement
    try(i, f, E) {
      if (!f && !E)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const T = new le();
      if (this._blockNode(T), this.code(i), f) {
        const I = this.name("e");
        this._currNode = T.catch = new de(I), f(I);
      }
      return E && (this._currNode = T.finally = new me(), this.code(E)), this._endBlockNode(de, me);
    }
    // `throw` statement
    throw(i) {
      return this._leafNode(new h(i));
    }
    // start self-balancing block
    block(i, f) {
      return this._blockStarts.push(this._nodes.length), i && this.code(i).endBlock(f), this;
    }
    // end the current self-balancing block
    endBlock(i) {
      const f = this._blockStarts.pop();
      if (f === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const E = this._nodes.length - f;
      if (E < 0 || i !== void 0 && E !== i)
        throw new Error(`CodeGen: wrong number of nodes: ${E} vs ${i} expected`);
      return this._nodes.length = f, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(i, f = t.nil, E, T) {
      return this._blockNode(new U(i, f, E)), T && this.code(T).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(U);
    }
    optimize(i = 1) {
      for (; i-- > 0; )
        this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(i) {
      return this._currNode.nodes.push(i), this;
    }
    _blockNode(i) {
      this._currNode.nodes.push(i), this._nodes.push(i);
    }
    _endBlockNode(i, f) {
      const E = this._currNode;
      if (E instanceof i || f && E instanceof f)
        return this._nodes.pop(), this;
      throw new Error(`CodeGen: not in block "${f ? `${i.kind}/${f.kind}` : i.kind}"`);
    }
    _elseNode(i) {
      const f = this._currNode;
      if (!(f instanceof m))
        throw new Error('CodeGen: "else" without "if"');
      return this._currNode = f.else = i, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const i = this._nodes;
      return i[i.length - 1];
    }
    set _currNode(i) {
      const f = this._nodes;
      f[f.length - 1] = i;
    }
  }
  e.CodeGen = V;
  function q($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) + (i[f] || 0);
    return $;
  }
  function ne($, i) {
    return i instanceof t._CodeOrName ? q($, i.names) : $;
  }
  function K($, i, f) {
    if ($ instanceof t.Name)
      return E($);
    if (!T($))
      return $;
    return new t._Code($._items.reduce((I, D) => (D instanceof t.Name && (D = E(D)), D instanceof t._Code ? I.push(...D._items) : I.push(D), I), []));
    function E(I) {
      const D = f[I.str];
      return D === void 0 || i[I.str] !== 1 ? I : (delete i[I.str], D);
    }
    function T(I) {
      return I instanceof t._Code && I._items.some((D) => D instanceof t.Name && i[D.str] === 1 && f[D.str] !== void 0);
    }
  }
  function oe($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) - (i[f] || 0);
  }
  function Ee($) {
    return typeof $ == "boolean" || typeof $ == "number" || $ === null ? !$ : (0, t._)`!${b($)}`;
  }
  e.not = Ee;
  const A = p(e.operators.AND);
  function j(...$) {
    return $.reduce(A);
  }
  e.and = j;
  const M = p(e.operators.OR);
  function P(...$) {
    return $.reduce(M);
  }
  e.or = P;
  function p($) {
    return (i, f) => i === t.nil ? f : f === t.nil ? i : (0, t._)`${b(i)} ${$} ${b(f)}`;
  }
  function b($) {
    return $ instanceof t.Name ? $ : (0, t._)`(${$})`;
  }
})(W);
var k = {};
Object.defineProperty(k, "__esModule", { value: !0 });
k.checkStrictMode = k.getErrorPath = k.Type = k.useFunc = k.setEvaluated = k.evaluatedPropsToName = k.mergeEvaluated = k.eachItem = k.unescapeJsonPointer = k.escapeJsonPointer = k.escapeFragment = k.unescapeFragment = k.schemaRefOrVal = k.schemaHasRulesButRef = k.schemaHasRules = k.checkUnknownRules = k.alwaysValidSchema = k.toHash = void 0;
const se = W, qd = un;
function Kd(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
k.toHash = Kd;
function Gd(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (ol(e, t), !il(t, e.self.RULES.all));
}
k.alwaysValidSchema = Gd;
function ol(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || ul(e, `unknown keyword: "${a}"`);
}
k.checkUnknownRules = ol;
function il(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
k.schemaHasRules = il;
function Hd(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
k.schemaHasRulesButRef = Hd;
function Bd({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, se._)`${r}`;
  }
  return (0, se._)`${e}${t}${(0, se.getProperty)(n)}`;
}
k.schemaRefOrVal = Bd;
function Xd(e) {
  return cl(decodeURIComponent(e));
}
k.unescapeFragment = Xd;
function Jd(e) {
  return encodeURIComponent(_a(e));
}
k.escapeFragment = Jd;
function _a(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
k.escapeJsonPointer = _a;
function cl(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
k.unescapeJsonPointer = cl;
function Wd(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
k.eachItem = Wd;
function Ni({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, u) => {
    const c = o === void 0 ? a : o instanceof se.Name ? (a instanceof se.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof se.Name ? (t(s, o, a), a) : r(a, o);
    return u === se.Name && !(c instanceof se.Name) ? n(s, c) : c;
  };
}
k.mergeEvaluated = {
  props: Ni({
    mergeNames: (e, t, r) => e.if((0, se._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, se._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, se._)`${r} || {}`).code((0, se._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, se._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, se._)`${r} || {}`), va(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: ll
  }),
  items: Ni({
    mergeNames: (e, t, r) => e.if((0, se._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, se._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, se._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, se._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function ll(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, se._)`{}`);
  return t !== void 0 && va(e, r, t), r;
}
k.evaluatedPropsToName = ll;
function va(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, se._)`${t}${(0, se.getProperty)(n)}`, !0));
}
k.setEvaluated = va;
const Ri = {};
function Yd(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: Ri[t.code] || (Ri[t.code] = new qd._Code(t.code))
  });
}
k.useFunc = Yd;
var Zs;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(Zs || (k.Type = Zs = {}));
function Qd(e, t, r) {
  if (e instanceof se.Name) {
    const n = t === Zs.Num;
    return r ? n ? (0, se._)`"[" + ${e} + "]"` : (0, se._)`"['" + ${e} + "']"` : n ? (0, se._)`"/" + ${e}` : (0, se._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, se.getProperty)(e).toString() : "/" + _a(e);
}
k.getErrorPath = Qd;
function ul(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
k.checkStrictMode = ul;
var ze = {};
Object.defineProperty(ze, "__esModule", { value: !0 });
const Pe = W, Zd = {
  // validation function arguments
  data: new Pe.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new Pe.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new Pe.Name("instancePath"),
  parentData: new Pe.Name("parentData"),
  parentDataProperty: new Pe.Name("parentDataProperty"),
  rootData: new Pe.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new Pe.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new Pe.Name("vErrors"),
  // null or array of validation errors
  errors: new Pe.Name("errors"),
  // counter of validation errors
  this: new Pe.Name("this"),
  // "globals"
  self: new Pe.Name("self"),
  scope: new Pe.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new Pe.Name("json"),
  jsonPos: new Pe.Name("jsonPos"),
  jsonLen: new Pe.Name("jsonLen"),
  jsonPart: new Pe.Name("jsonPart")
};
ze.default = Zd;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = W, r = k, n = ze;
  e.keywordError = {
    message: ({ keyword: y }) => (0, t.str)`must pass "${y}" keyword validation`
  }, e.keyword$DataError = {
    message: ({ keyword: y, schemaType: m }) => m ? (0, t.str)`"${y}" keyword must be ${m} ($data)` : (0, t.str)`"${y}" keyword is invalid ($data)`
  };
  function s(y, m = e.keywordError, v, N) {
    const { it: R } = y, { gen: O, compositeRule: U, allErrors: B } = R, le = h(y, m, v);
    N ?? (U || B) ? c(O, le) : d(R, (0, t._)`[${le}]`);
  }
  e.reportError = s;
  function a(y, m = e.keywordError, v) {
    const { it: N } = y, { gen: R, compositeRule: O, allErrors: U } = N, B = h(y, m, v);
    c(R, B), O || U || d(N, n.default.vErrors);
  }
  e.reportExtraError = a;
  function o(y, m) {
    y.assign(n.default.errors, m), y.if((0, t._)`${n.default.vErrors} !== null`, () => y.if(m, () => y.assign((0, t._)`${n.default.vErrors}.length`, m), () => y.assign(n.default.vErrors, null)));
  }
  e.resetErrorsCount = o;
  function u({ gen: y, keyword: m, schemaValue: v, data: N, errsCount: R, it: O }) {
    if (R === void 0)
      throw new Error("ajv implementation error");
    const U = y.name("err");
    y.forRange("i", R, n.default.errors, (B) => {
      y.const(U, (0, t._)`${n.default.vErrors}[${B}]`), y.if((0, t._)`${U}.instancePath === undefined`, () => y.assign((0, t._)`${U}.instancePath`, (0, t.strConcat)(n.default.instancePath, O.errorPath))), y.assign((0, t._)`${U}.schemaPath`, (0, t.str)`${O.errSchemaPath}/${m}`), O.opts.verbose && (y.assign((0, t._)`${U}.schema`, v), y.assign((0, t._)`${U}.data`, N));
    });
  }
  e.extendErrors = u;
  function c(y, m) {
    const v = y.const("err", m);
    y.if((0, t._)`${n.default.vErrors} === null`, () => y.assign(n.default.vErrors, (0, t._)`[${v}]`), (0, t._)`${n.default.vErrors}.push(${v})`), y.code((0, t._)`${n.default.errors}++`);
  }
  function d(y, m) {
    const { gen: v, validateName: N, schemaEnv: R } = y;
    R.$async ? v.throw((0, t._)`new ${y.ValidationError}(${m})`) : (v.assign((0, t._)`${N}.errors`, m), v.return(!1));
  }
  const l = {
    keyword: new t.Name("keyword"),
    schemaPath: new t.Name("schemaPath"),
    // also used in JTD errors
    params: new t.Name("params"),
    propertyName: new t.Name("propertyName"),
    message: new t.Name("message"),
    schema: new t.Name("schema"),
    parentSchema: new t.Name("parentSchema")
  };
  function h(y, m, v) {
    const { createErrors: N } = y.it;
    return N === !1 ? (0, t._)`{}` : S(y, m, v);
  }
  function S(y, m, v = {}) {
    const { gen: N, it: R } = y, O = [
      g(R, v),
      w(y, v)
    ];
    return _(y, m, O), N.object(...O);
  }
  function g({ errorPath: y }, { instancePath: m }) {
    const v = m ? (0, t.str)`${y}${(0, r.getErrorPath)(m, r.Type.Str)}` : y;
    return [n.default.instancePath, (0, t.strConcat)(n.default.instancePath, v)];
  }
  function w({ keyword: y, it: { errSchemaPath: m } }, { schemaPath: v, parentSchema: N }) {
    let R = N ? m : (0, t.str)`${m}/${y}`;
    return v && (R = (0, t.str)`${R}${(0, r.getErrorPath)(v, r.Type.Str)}`), [l.schemaPath, R];
  }
  function _(y, { params: m, message: v }, N) {
    const { keyword: R, data: O, schemaValue: U, it: B } = y, { opts: le, propertyName: de, topSchemaRef: me, schemaPath: V } = B;
    N.push([l.keyword, R], [l.params, typeof m == "function" ? m(y) : m || (0, t._)`{}`]), le.messages && N.push([l.message, typeof v == "function" ? v(y) : v]), le.verbose && N.push([l.schema, U], [l.parentSchema, (0, t._)`${me}${V}`], [n.default.data, O]), de && N.push([l.propertyName, de]);
  }
})(fn);
Object.defineProperty(Or, "__esModule", { value: !0 });
Or.boolOrEmptySchema = Or.topBoolOrEmptySchema = void 0;
const xd = fn, ef = W, tf = ze, rf = {
  message: "boolean schema is false"
};
function nf(e) {
  const { gen: t, schema: r, validateName: n } = e;
  r === !1 ? dl(e, !1) : typeof r == "object" && r.$async === !0 ? t.return(tf.default.data) : (t.assign((0, ef._)`${n}.errors`, null), t.return(!0));
}
Or.topBoolOrEmptySchema = nf;
function sf(e, t) {
  const { gen: r, schema: n } = e;
  n === !1 ? (r.var(t, !1), dl(e)) : r.var(t, !0);
}
Or.boolOrEmptySchema = sf;
function dl(e, t) {
  const { gen: r, data: n } = e, s = {
    gen: r,
    keyword: "false schema",
    data: n,
    schema: !1,
    schemaCode: !1,
    schemaValue: !1,
    params: {},
    it: e
  };
  (0, xd.reportError)(s, rf, void 0, t);
}
var pe = {}, ir = {};
Object.defineProperty(ir, "__esModule", { value: !0 });
ir.getRules = ir.isJSONType = void 0;
const af = ["string", "number", "integer", "boolean", "null", "object", "array"], of = new Set(af);
function cf(e) {
  return typeof e == "string" && of.has(e);
}
ir.isJSONType = cf;
function lf() {
  const e = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...e, integer: !0, boolean: !0, null: !0 },
    rules: [{ rules: [] }, e.number, e.string, e.array, e.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
ir.getRules = lf;
var ft = {};
Object.defineProperty(ft, "__esModule", { value: !0 });
ft.shouldUseRule = ft.shouldUseGroup = ft.schemaHasRulesForType = void 0;
function uf({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && fl(e, n);
}
ft.schemaHasRulesForType = uf;
function fl(e, t) {
  return t.rules.some((r) => hl(e, r));
}
ft.shouldUseGroup = fl;
function hl(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
ft.shouldUseRule = hl;
Object.defineProperty(pe, "__esModule", { value: !0 });
pe.reportTypeError = pe.checkDataTypes = pe.checkDataType = pe.coerceAndCheckDataType = pe.getJSONTypes = pe.getSchemaTypes = pe.DataType = void 0;
const df = ir, ff = ft, hf = fn, Y = W, ml = k;
var br;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(br || (pe.DataType = br = {}));
function mf(e) {
  const t = pl(e.type);
  if (t.includes("null")) {
    if (e.nullable === !1)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!t.length && e.nullable !== void 0)
      throw new Error('"nullable" cannot be used without "type"');
    e.nullable === !0 && t.push("null");
  }
  return t;
}
pe.getSchemaTypes = mf;
function pl(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(df.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
pe.getJSONTypes = pl;
function pf(e, t) {
  const { gen: r, data: n, opts: s } = e, a = $f(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, ff.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const u = wa(t, n, s.strictNumbers, br.Wrong);
    r.if(u, () => {
      a.length ? yf(e, t, a) : Ea(e);
    });
  }
  return o;
}
pe.coerceAndCheckDataType = pf;
const $l = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function $f(e, t) {
  return t ? e.filter((r) => $l.has(r) || t === "array" && r === "array") : [];
}
function yf(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, Y._)`typeof ${s}`), u = n.let("coerced", (0, Y._)`undefined`);
  a.coerceTypes === "array" && n.if((0, Y._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, Y._)`${s}[0]`).assign(o, (0, Y._)`typeof ${s}`).if(wa(t, s, a.strictNumbers), () => n.assign(u, s))), n.if((0, Y._)`${u} !== undefined`);
  for (const d of r)
    ($l.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), Ea(e), n.endIf(), n.if((0, Y._)`${u} !== undefined`, () => {
    n.assign(s, u), gf(e, u);
  });
  function c(d) {
    switch (d) {
      case "string":
        n.elseIf((0, Y._)`${o} == "number" || ${o} == "boolean"`).assign(u, (0, Y._)`"" + ${s}`).elseIf((0, Y._)`${s} === null`).assign(u, (0, Y._)`""`);
        return;
      case "number":
        n.elseIf((0, Y._)`${o} == "boolean" || ${s} === null
              || (${o} == "string" && ${s} && ${s} == +${s})`).assign(u, (0, Y._)`+${s}`);
        return;
      case "integer":
        n.elseIf((0, Y._)`${o} === "boolean" || ${s} === null
              || (${o} === "string" && ${s} && ${s} == +${s} && !(${s} % 1))`).assign(u, (0, Y._)`+${s}`);
        return;
      case "boolean":
        n.elseIf((0, Y._)`${s} === "false" || ${s} === 0 || ${s} === null`).assign(u, !1).elseIf((0, Y._)`${s} === "true" || ${s} === 1`).assign(u, !0);
        return;
      case "null":
        n.elseIf((0, Y._)`${s} === "" || ${s} === 0 || ${s} === false`), n.assign(u, null);
        return;
      case "array":
        n.elseIf((0, Y._)`${o} === "string" || ${o} === "number"
              || ${o} === "boolean" || ${s} === null`).assign(u, (0, Y._)`[${s}]`);
    }
  }
}
function gf({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, Y._)`${t} !== undefined`, () => e.assign((0, Y._)`${t}[${r}]`, n));
}
function xs(e, t, r, n = br.Correct) {
  const s = n === br.Correct ? Y.operators.EQ : Y.operators.NEQ;
  let a;
  switch (e) {
    case "null":
      return (0, Y._)`${t} ${s} null`;
    case "array":
      a = (0, Y._)`Array.isArray(${t})`;
      break;
    case "object":
      a = (0, Y._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
      break;
    case "integer":
      a = o((0, Y._)`!(${t} % 1) && !isNaN(${t})`);
      break;
    case "number":
      a = o();
      break;
    default:
      return (0, Y._)`typeof ${t} ${s} ${e}`;
  }
  return n === br.Correct ? a : (0, Y.not)(a);
  function o(u = Y.nil) {
    return (0, Y.and)((0, Y._)`typeof ${t} == "number"`, u, r ? (0, Y._)`isFinite(${t})` : Y.nil);
  }
}
pe.checkDataType = xs;
function wa(e, t, r, n) {
  if (e.length === 1)
    return xs(e[0], t, r, n);
  let s;
  const a = (0, ml.toHash)(e);
  if (a.array && a.object) {
    const o = (0, Y._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, Y._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = Y.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, Y.and)(s, xs(o, t, r, n));
  return s;
}
pe.checkDataTypes = wa;
const _f = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, Y._)`{type: ${e}}` : (0, Y._)`{type: ${t}}`
};
function Ea(e) {
  const t = vf(e);
  (0, hf.reportError)(t, _f);
}
pe.reportTypeError = Ea;
function vf(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, ml.schemaRefOrVal)(e, n, "type");
  return {
    gen: t,
    keyword: "type",
    data: r,
    schema: n.type,
    schemaCode: s,
    schemaValue: s,
    parentSchema: n,
    params: {},
    it: e
  };
}
var is = {};
Object.defineProperty(is, "__esModule", { value: !0 });
is.assignDefaults = void 0;
const fr = W, wf = k;
function Ef(e, t) {
  const { properties: r, items: n } = e.schema;
  if (t === "object" && r)
    for (const s in r)
      Oi(e, s, r[s].default);
  else t === "array" && Array.isArray(n) && n.forEach((s, a) => Oi(e, a, s.default));
}
is.assignDefaults = Ef;
function Oi(e, t, r) {
  const { gen: n, compositeRule: s, data: a, opts: o } = e;
  if (r === void 0)
    return;
  const u = (0, fr._)`${a}${(0, fr.getProperty)(t)}`;
  if (s) {
    (0, wf.checkStrictMode)(e, `default is ignored for: ${u}`);
    return;
  }
  let c = (0, fr._)`${u} === undefined`;
  o.useDefaults === "empty" && (c = (0, fr._)`${c} || ${u} === null || ${u} === ""`), n.if(c, (0, fr._)`${u} = ${(0, fr.stringify)(r)}`);
}
var ot = {}, ee = {};
Object.defineProperty(ee, "__esModule", { value: !0 });
ee.validateUnion = ee.validateArray = ee.usePattern = ee.callValidateCode = ee.schemaProperties = ee.allSchemaProperties = ee.noPropertyInData = ee.propertyInData = ee.isOwnProperty = ee.hasPropFunc = ee.reportMissingProp = ee.checkMissingProp = ee.checkReportMissingProp = void 0;
const ie = W, ba = k, vt = ze, bf = k;
function Sf(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if(Pa(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, ie._)`${t}` }, !0), e.error();
  });
}
ee.checkReportMissingProp = Sf;
function Pf({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, ie.or)(...n.map((a) => (0, ie.and)(Pa(e, t, a, r.ownProperties), (0, ie._)`${s} = ${a}`)));
}
ee.checkMissingProp = Pf;
function Nf(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
ee.reportMissingProp = Nf;
function yl(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, ie._)`Object.prototype.hasOwnProperty`
  });
}
ee.hasPropFunc = yl;
function Sa(e, t, r) {
  return (0, ie._)`${yl(e)}.call(${t}, ${r})`;
}
ee.isOwnProperty = Sa;
function Rf(e, t, r, n) {
  const s = (0, ie._)`${t}${(0, ie.getProperty)(r)} !== undefined`;
  return n ? (0, ie._)`${s} && ${Sa(e, t, r)}` : s;
}
ee.propertyInData = Rf;
function Pa(e, t, r, n) {
  const s = (0, ie._)`${t}${(0, ie.getProperty)(r)} === undefined`;
  return n ? (0, ie.or)(s, (0, ie.not)(Sa(e, t, r))) : s;
}
ee.noPropertyInData = Pa;
function gl(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
ee.allSchemaProperties = gl;
function Of(e, t) {
  return gl(t).filter((r) => !(0, ba.alwaysValidSchema)(e, t[r]));
}
ee.schemaProperties = Of;
function If({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, u, c, d) {
  const l = d ? (0, ie._)`${e}, ${t}, ${n}${s}` : t, h = [
    [vt.default.instancePath, (0, ie.strConcat)(vt.default.instancePath, a)],
    [vt.default.parentData, o.parentData],
    [vt.default.parentDataProperty, o.parentDataProperty],
    [vt.default.rootData, vt.default.rootData]
  ];
  o.opts.dynamicRef && h.push([vt.default.dynamicAnchors, vt.default.dynamicAnchors]);
  const S = (0, ie._)`${l}, ${r.object(...h)}`;
  return c !== ie.nil ? (0, ie._)`${u}.call(${c}, ${S})` : (0, ie._)`${u}(${S})`;
}
ee.callValidateCode = If;
const Tf = (0, ie._)`new RegExp`;
function jf({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, ie._)`${s.code === "new RegExp" ? Tf : (0, bf.useFunc)(e, s)}(${r}, ${n})`
  });
}
ee.usePattern = jf;
function Af(e) {
  const { gen: t, data: r, keyword: n, it: s } = e, a = t.name("valid");
  if (s.allErrors) {
    const u = t.let("valid", !0);
    return o(() => t.assign(u, !1)), u;
  }
  return t.var(a, !0), o(() => t.break()), a;
  function o(u) {
    const c = t.const("len", (0, ie._)`${r}.length`);
    t.forRange("i", 0, c, (d) => {
      e.subschema({
        keyword: n,
        dataProp: d,
        dataPropType: ba.Type.Num
      }, a), t.if((0, ie.not)(a), u);
    });
  }
}
ee.validateArray = Af;
function kf(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, ba.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
    return;
  const o = t.let("valid", !1), u = t.name("_valid");
  t.block(() => r.forEach((c, d) => {
    const l = e.subschema({
      keyword: n,
      schemaProp: d,
      compositeRule: !0
    }, u);
    t.assign(o, (0, ie._)`${o} || ${u}`), e.mergeValidEvaluated(l, u) || t.if((0, ie.not)(o));
  })), e.result(o, () => e.reset(), () => e.error(!0));
}
ee.validateUnion = kf;
Object.defineProperty(ot, "__esModule", { value: !0 });
ot.validateKeywordUsage = ot.validSchemaType = ot.funcKeywordCode = ot.macroKeywordCode = void 0;
const Te = W, Yt = ze, Cf = ee, Df = fn;
function Mf(e, t) {
  const { gen: r, keyword: n, schema: s, parentSchema: a, it: o } = e, u = t.macro.call(o.self, s, a, o), c = _l(r, n, u);
  o.opts.validateSchema !== !1 && o.self.validateSchema(u, !0);
  const d = r.name("valid");
  e.subschema({
    schema: u,
    schemaPath: Te.nil,
    errSchemaPath: `${o.errSchemaPath}/${n}`,
    topSchemaRef: c,
    compositeRule: !0
  }, d), e.pass(d, () => e.error(!0));
}
ot.macroKeywordCode = Mf;
function Lf(e, t) {
  var r;
  const { gen: n, keyword: s, schema: a, parentSchema: o, $data: u, it: c } = e;
  Ff(c, t);
  const d = !u && t.compile ? t.compile.call(c.self, a, o, c) : t.validate, l = _l(n, s, d), h = n.let("valid");
  e.block$data(h, S), e.ok((r = t.valid) !== null && r !== void 0 ? r : h);
  function S() {
    if (t.errors === !1)
      _(), t.modifying && Ii(e), y(() => e.error());
    else {
      const m = t.async ? g() : w();
      t.modifying && Ii(e), y(() => Vf(e, m));
    }
  }
  function g() {
    const m = n.let("ruleErrs", null);
    return n.try(() => _((0, Te._)`await `), (v) => n.assign(h, !1).if((0, Te._)`${v} instanceof ${c.ValidationError}`, () => n.assign(m, (0, Te._)`${v}.errors`), () => n.throw(v))), m;
  }
  function w() {
    const m = (0, Te._)`${l}.errors`;
    return n.assign(m, null), _(Te.nil), m;
  }
  function _(m = t.async ? (0, Te._)`await ` : Te.nil) {
    const v = c.opts.passContext ? Yt.default.this : Yt.default.self, N = !("compile" in t && !u || t.schema === !1);
    n.assign(h, (0, Te._)`${m}${(0, Cf.callValidateCode)(e, l, v, N)}`, t.modifying);
  }
  function y(m) {
    var v;
    n.if((0, Te.not)((v = t.valid) !== null && v !== void 0 ? v : h), m);
  }
}
ot.funcKeywordCode = Lf;
function Ii(e) {
  const { gen: t, data: r, it: n } = e;
  t.if(n.parentData, () => t.assign(r, (0, Te._)`${n.parentData}[${n.parentDataProperty}]`));
}
function Vf(e, t) {
  const { gen: r } = e;
  r.if((0, Te._)`Array.isArray(${t})`, () => {
    r.assign(Yt.default.vErrors, (0, Te._)`${Yt.default.vErrors} === null ? ${t} : ${Yt.default.vErrors}.concat(${t})`).assign(Yt.default.errors, (0, Te._)`${Yt.default.vErrors}.length`), (0, Df.extendErrors)(e);
  }, () => e.error());
}
function Ff({ schemaEnv: e }, t) {
  if (t.async && !e.$async)
    throw new Error("async keyword in sync schema");
}
function _l(e, t, r) {
  if (r === void 0)
    throw new Error(`keyword "${t}" failed to compile`);
  return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, Te.stringify)(r) });
}
function zf(e, t, r = !1) {
  return !t.length || t.some((n) => n === "array" ? Array.isArray(e) : n === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == n || r && typeof e > "u");
}
ot.validSchemaType = zf;
function Uf({ schema: e, opts: t, self: r, errSchemaPath: n }, s, a) {
  if (Array.isArray(s.keyword) ? !s.keyword.includes(a) : s.keyword !== a)
    throw new Error("ajv implementation error");
  const o = s.dependencies;
  if (o != null && o.some((u) => !Object.prototype.hasOwnProperty.call(e, u)))
    throw new Error(`parent schema must have dependencies of ${a}: ${o.join(",")}`);
  if (s.validateSchema && !s.validateSchema(e[a])) {
    const c = `keyword "${a}" value is invalid at path "${n}": ` + r.errorsText(s.validateSchema.errors);
    if (t.validateSchema === "log")
      r.logger.error(c);
    else
      throw new Error(c);
  }
}
ot.validateKeywordUsage = Uf;
var At = {};
Object.defineProperty(At, "__esModule", { value: !0 });
At.extendSubschemaMode = At.extendSubschemaData = At.getSubschema = void 0;
const st = W, vl = k;
function qf(e, { keyword: t, schemaProp: r, schema: n, schemaPath: s, errSchemaPath: a, topSchemaRef: o }) {
  if (t !== void 0 && n !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (t !== void 0) {
    const u = e.schema[t];
    return r === void 0 ? {
      schema: u,
      schemaPath: (0, st._)`${e.schemaPath}${(0, st.getProperty)(t)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}`
    } : {
      schema: u[r],
      schemaPath: (0, st._)`${e.schemaPath}${(0, st.getProperty)(t)}${(0, st.getProperty)(r)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}/${(0, vl.escapeFragment)(r)}`
    };
  }
  if (n !== void 0) {
    if (s === void 0 || a === void 0 || o === void 0)
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    return {
      schema: n,
      schemaPath: s,
      topSchemaRef: o,
      errSchemaPath: a
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
At.getSubschema = qf;
function Kf(e, t, { dataProp: r, dataPropType: n, data: s, dataTypes: a, propertyName: o }) {
  if (s !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: u } = t;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: l, opts: h } = t, S = u.let("data", (0, st._)`${t.data}${(0, st.getProperty)(r)}`, !0);
    c(S), e.errorPath = (0, st.str)`${d}${(0, vl.getErrorPath)(r, n, h.jsPropertySyntax)}`, e.parentDataProperty = (0, st._)`${r}`, e.dataPathArr = [...l, e.parentDataProperty];
  }
  if (s !== void 0) {
    const d = s instanceof st.Name ? s : u.let("data", s, !0);
    c(d), o !== void 0 && (e.propertyName = o);
  }
  a && (e.dataTypes = a);
  function c(d) {
    e.data = d, e.dataLevel = t.dataLevel + 1, e.dataTypes = [], t.definedProperties = /* @__PURE__ */ new Set(), e.parentData = t.data, e.dataNames = [...t.dataNames, d];
  }
}
At.extendSubschemaData = Kf;
function Gf(e, { jtdDiscriminator: t, jtdMetadata: r, compositeRule: n, createErrors: s, allErrors: a }) {
  n !== void 0 && (e.compositeRule = n), s !== void 0 && (e.createErrors = s), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = r;
}
At.extendSubschemaMode = Gf;
var ve = {}, cs = function e(t, r) {
  if (t === r) return !0;
  if (t && r && typeof t == "object" && typeof r == "object") {
    if (t.constructor !== r.constructor) return !1;
    var n, s, a;
    if (Array.isArray(t)) {
      if (n = t.length, n != r.length) return !1;
      for (s = n; s-- !== 0; )
        if (!e(t[s], r[s])) return !1;
      return !0;
    }
    if (t.constructor === RegExp) return t.source === r.source && t.flags === r.flags;
    if (t.valueOf !== Object.prototype.valueOf) return t.valueOf() === r.valueOf();
    if (t.toString !== Object.prototype.toString) return t.toString() === r.toString();
    if (a = Object.keys(t), n = a.length, n !== Object.keys(r).length) return !1;
    for (s = n; s-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(r, a[s])) return !1;
    for (s = n; s-- !== 0; ) {
      var o = a[s];
      if (!e(t[o], r[o])) return !1;
    }
    return !0;
  }
  return t !== t && r !== r;
}, wl = { exports: {} }, Tt = wl.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  zn(t, n, s, e, "", e);
};
Tt.keywords = {
  additionalItems: !0,
  items: !0,
  contains: !0,
  additionalProperties: !0,
  propertyNames: !0,
  not: !0,
  if: !0,
  then: !0,
  else: !0
};
Tt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Tt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Tt.skipKeywords = {
  default: !0,
  enum: !0,
  const: !0,
  required: !0,
  maximum: !0,
  minimum: !0,
  exclusiveMaximum: !0,
  exclusiveMinimum: !0,
  multipleOf: !0,
  maxLength: !0,
  minLength: !0,
  pattern: !0,
  format: !0,
  maxItems: !0,
  minItems: !0,
  uniqueItems: !0,
  maxProperties: !0,
  minProperties: !0
};
function zn(e, t, r, n, s, a, o, u, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, u, c, d);
    for (var l in n) {
      var h = n[l];
      if (Array.isArray(h)) {
        if (l in Tt.arrayKeywords)
          for (var S = 0; S < h.length; S++)
            zn(e, t, r, h[S], s + "/" + l + "/" + S, a, s, l, n, S);
      } else if (l in Tt.propsKeywords) {
        if (h && typeof h == "object")
          for (var g in h)
            zn(e, t, r, h[g], s + "/" + l + "/" + Hf(g), a, s, l, n, g);
      } else (l in Tt.keywords || e.allKeys && !(l in Tt.skipKeywords)) && zn(e, t, r, h, s + "/" + l, a, s, l, n);
    }
    r(n, s, a, o, u, c, d);
  }
}
function Hf(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var Bf = wl.exports;
Object.defineProperty(ve, "__esModule", { value: !0 });
ve.getSchemaRefs = ve.resolveUrl = ve.normalizeId = ve._getFullPath = ve.getFullPath = ve.inlineRef = void 0;
const Xf = k, Jf = cs, Wf = Bf, Yf = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function Qf(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !ea(e) : t ? El(e) <= t : !1;
}
ve.inlineRef = Qf;
const Zf = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function ea(e) {
  for (const t in e) {
    if (Zf.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(ea) || typeof r == "object" && ea(r))
      return !0;
  }
  return !1;
}
function El(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !Yf.has(r) && (typeof e[r] == "object" && (0, Xf.eachItem)(e[r], (n) => t += El(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function bl(e, t = "", r) {
  r !== !1 && (t = Sr(t));
  const n = e.parse(t);
  return Sl(e, n);
}
ve.getFullPath = bl;
function Sl(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
ve._getFullPath = Sl;
const xf = /#\/?$/;
function Sr(e) {
  return e ? e.replace(xf, "") : "";
}
ve.normalizeId = Sr;
function eh(e, t, r) {
  return r = Sr(r), e.resolve(t, r);
}
ve.resolveUrl = eh;
const th = /^[a-z_][-a-z0-9._]*$/i;
function rh(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = Sr(e[r] || t), a = { "": s }, o = bl(n, s, !1), u = {}, c = /* @__PURE__ */ new Set();
  return Wf(e, { allKeys: !0 }, (h, S, g, w) => {
    if (w === void 0)
      return;
    const _ = o + S;
    let y = a[w];
    typeof h[r] == "string" && (y = m.call(this, h[r])), v.call(this, h.$anchor), v.call(this, h.$dynamicAnchor), a[S] = y;
    function m(N) {
      const R = this.opts.uriResolver.resolve;
      if (N = Sr(y ? R(y, N) : N), c.has(N))
        throw l(N);
      c.add(N);
      let O = this.refs[N];
      return typeof O == "string" && (O = this.refs[O]), typeof O == "object" ? d(h, O.schema, N) : N !== Sr(_) && (N[0] === "#" ? (d(h, u[N], N), u[N] = h) : this.refs[N] = _), N;
    }
    function v(N) {
      if (typeof N == "string") {
        if (!th.test(N))
          throw new Error(`invalid anchor "${N}"`);
        m.call(this, `#${N}`);
      }
    }
  }), u;
  function d(h, S, g) {
    if (S !== void 0 && !Jf(h, S))
      throw l(g);
  }
  function l(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
ve.getSchemaRefs = rh;
Object.defineProperty(Ze, "__esModule", { value: !0 });
Ze.getData = Ze.KeywordCxt = Ze.validateFunctionCode = void 0;
const Pl = Or, Ti = pe, Na = ft, Qn = pe, nh = is, xr = ot, Is = At, F = W, G = ze, sh = ve, ht = k, Hr = fn;
function ah(e) {
  if (Ol(e) && (Il(e), Rl(e))) {
    ch(e);
    return;
  }
  Nl(e, () => (0, Pl.topBoolOrEmptySchema)(e));
}
Ze.validateFunctionCode = ah;
function Nl({ gen: e, validateName: t, schema: r, schemaEnv: n, opts: s }, a) {
  s.code.es5 ? e.func(t, (0, F._)`${G.default.data}, ${G.default.valCxt}`, n.$async, () => {
    e.code((0, F._)`"use strict"; ${ji(r, s)}`), ih(e, s), e.code(a);
  }) : e.func(t, (0, F._)`${G.default.data}, ${oh(s)}`, n.$async, () => e.code(ji(r, s)).code(a));
}
function oh(e) {
  return (0, F._)`{${G.default.instancePath}="", ${G.default.parentData}, ${G.default.parentDataProperty}, ${G.default.rootData}=${G.default.data}${e.dynamicRef ? (0, F._)`, ${G.default.dynamicAnchors}={}` : F.nil}}={}`;
}
function ih(e, t) {
  e.if(G.default.valCxt, () => {
    e.var(G.default.instancePath, (0, F._)`${G.default.valCxt}.${G.default.instancePath}`), e.var(G.default.parentData, (0, F._)`${G.default.valCxt}.${G.default.parentData}`), e.var(G.default.parentDataProperty, (0, F._)`${G.default.valCxt}.${G.default.parentDataProperty}`), e.var(G.default.rootData, (0, F._)`${G.default.valCxt}.${G.default.rootData}`), t.dynamicRef && e.var(G.default.dynamicAnchors, (0, F._)`${G.default.valCxt}.${G.default.dynamicAnchors}`);
  }, () => {
    e.var(G.default.instancePath, (0, F._)`""`), e.var(G.default.parentData, (0, F._)`undefined`), e.var(G.default.parentDataProperty, (0, F._)`undefined`), e.var(G.default.rootData, G.default.data), t.dynamicRef && e.var(G.default.dynamicAnchors, (0, F._)`{}`);
  });
}
function ch(e) {
  const { schema: t, opts: r, gen: n } = e;
  Nl(e, () => {
    r.$comment && t.$comment && jl(e), hh(e), n.let(G.default.vErrors, null), n.let(G.default.errors, 0), r.unevaluated && lh(e), Tl(e), $h(e);
  });
}
function lh(e) {
  const { gen: t, validateName: r } = e;
  e.evaluated = t.const("evaluated", (0, F._)`${r}.evaluated`), t.if((0, F._)`${e.evaluated}.dynamicProps`, () => t.assign((0, F._)`${e.evaluated}.props`, (0, F._)`undefined`)), t.if((0, F._)`${e.evaluated}.dynamicItems`, () => t.assign((0, F._)`${e.evaluated}.items`, (0, F._)`undefined`));
}
function ji(e, t) {
  const r = typeof e == "object" && e[t.schemaId];
  return r && (t.code.source || t.code.process) ? (0, F._)`/*# sourceURL=${r} */` : F.nil;
}
function uh(e, t) {
  if (Ol(e) && (Il(e), Rl(e))) {
    dh(e, t);
    return;
  }
  (0, Pl.boolOrEmptySchema)(e, t);
}
function Rl({ schema: e, self: t }) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t.RULES.all[r])
      return !0;
  return !1;
}
function Ol(e) {
  return typeof e.schema != "boolean";
}
function dh(e, t) {
  const { schema: r, gen: n, opts: s } = e;
  s.$comment && r.$comment && jl(e), mh(e), ph(e);
  const a = n.const("_errs", G.default.errors);
  Tl(e, a), n.var(t, (0, F._)`${a} === ${G.default.errors}`);
}
function Il(e) {
  (0, ht.checkUnknownRules)(e), fh(e);
}
function Tl(e, t) {
  if (e.opts.jtd)
    return Ai(e, [], !1, t);
  const r = (0, Ti.getSchemaTypes)(e.schema), n = (0, Ti.coerceAndCheckDataType)(e, r);
  Ai(e, r, !n, t);
}
function fh(e) {
  const { schema: t, errSchemaPath: r, opts: n, self: s } = e;
  t.$ref && n.ignoreKeywordsWithRef && (0, ht.schemaHasRulesButRef)(t, s.RULES) && s.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function hh(e) {
  const { schema: t, opts: r } = e;
  t.default !== void 0 && r.useDefaults && r.strictSchema && (0, ht.checkStrictMode)(e, "default is ignored in the schema root");
}
function mh(e) {
  const t = e.schema[e.opts.schemaId];
  t && (e.baseId = (0, sh.resolveUrl)(e.opts.uriResolver, e.baseId, t));
}
function ph(e) {
  if (e.schema.$async && !e.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function jl({ gen: e, schemaEnv: t, schema: r, errSchemaPath: n, opts: s }) {
  const a = r.$comment;
  if (s.$comment === !0)
    e.code((0, F._)`${G.default.self}.logger.log(${a})`);
  else if (typeof s.$comment == "function") {
    const o = (0, F.str)`${n}/$comment`, u = e.scopeValue("root", { ref: t.root });
    e.code((0, F._)`${G.default.self}.opts.$comment(${a}, ${o}, ${u}.schema)`);
  }
}
function $h(e) {
  const { gen: t, schemaEnv: r, validateName: n, ValidationError: s, opts: a } = e;
  r.$async ? t.if((0, F._)`${G.default.errors} === 0`, () => t.return(G.default.data), () => t.throw((0, F._)`new ${s}(${G.default.vErrors})`)) : (t.assign((0, F._)`${n}.errors`, G.default.vErrors), a.unevaluated && yh(e), t.return((0, F._)`${G.default.errors} === 0`));
}
function yh({ gen: e, evaluated: t, props: r, items: n }) {
  r instanceof F.Name && e.assign((0, F._)`${t}.props`, r), n instanceof F.Name && e.assign((0, F._)`${t}.items`, n);
}
function Ai(e, t, r, n) {
  const { gen: s, schema: a, data: o, allErrors: u, opts: c, self: d } = e, { RULES: l } = d;
  if (a.$ref && (c.ignoreKeywordsWithRef || !(0, ht.schemaHasRulesButRef)(a, l))) {
    s.block(() => Cl(e, "$ref", l.all.$ref.definition));
    return;
  }
  c.jtd || gh(e, t), s.block(() => {
    for (const S of l.rules)
      h(S);
    h(l.post);
  });
  function h(S) {
    (0, Na.shouldUseGroup)(a, S) && (S.type ? (s.if((0, Qn.checkDataType)(S.type, o, c.strictNumbers)), ki(e, S), t.length === 1 && t[0] === S.type && r && (s.else(), (0, Qn.reportTypeError)(e)), s.endIf()) : ki(e, S), u || s.if((0, F._)`${G.default.errors} === ${n || 0}`));
  }
}
function ki(e, t) {
  const { gen: r, schema: n, opts: { useDefaults: s } } = e;
  s && (0, nh.assignDefaults)(e, t.type), r.block(() => {
    for (const a of t.rules)
      (0, Na.shouldUseRule)(n, a) && Cl(e, a.keyword, a.definition, t.type);
  });
}
function gh(e, t) {
  e.schemaEnv.meta || !e.opts.strictTypes || (_h(e, t), e.opts.allowUnionTypes || vh(e, t), wh(e, e.dataTypes));
}
function _h(e, t) {
  if (t.length) {
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    t.forEach((r) => {
      Al(e.dataTypes, r) || Ra(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }), bh(e, t);
  }
}
function vh(e, t) {
  t.length > 1 && !(t.length === 2 && t.includes("null")) && Ra(e, "use allowUnionTypes to allow union type keyword");
}
function wh(e, t) {
  const r = e.self.RULES.all;
  for (const n in r) {
    const s = r[n];
    if (typeof s == "object" && (0, Na.shouldUseRule)(e.schema, s)) {
      const { type: a } = s.definition;
      a.length && !a.some((o) => Eh(t, o)) && Ra(e, `missing type "${a.join(",")}" for keyword "${n}"`);
    }
  }
}
function Eh(e, t) {
  return e.includes(t) || t === "number" && e.includes("integer");
}
function Al(e, t) {
  return e.includes(t) || t === "integer" && e.includes("number");
}
function bh(e, t) {
  const r = [];
  for (const n of e.dataTypes)
    Al(t, n) ? r.push(n) : t.includes("integer") && n === "number" && r.push("integer");
  e.dataTypes = r;
}
function Ra(e, t) {
  const r = e.schemaEnv.baseId + e.errSchemaPath;
  t += ` at "${r}" (strictTypes)`, (0, ht.checkStrictMode)(e, t, e.opts.strictTypes);
}
let kl = class {
  constructor(t, r, n) {
    if ((0, xr.validateKeywordUsage)(t, r, n), this.gen = t.gen, this.allErrors = t.allErrors, this.keyword = n, this.data = t.data, this.schema = t.schema[n], this.$data = r.$data && t.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, ht.schemaRefOrVal)(t, this.schema, n, this.$data), this.schemaType = r.schemaType, this.parentSchema = t.schema, this.params = {}, this.it = t, this.def = r, this.$data)
      this.schemaCode = t.gen.const("vSchema", Dl(this.$data, t));
    else if (this.schemaCode = this.schemaValue, !(0, xr.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${n} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = t.gen.const("_errs", G.default.errors));
  }
  result(t, r, n) {
    this.failResult((0, F.not)(t), r, n);
  }
  failResult(t, r, n) {
    this.gen.if(t), n ? n() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(t, r) {
    this.failResult((0, F.not)(t), void 0, r);
  }
  fail(t) {
    if (t === void 0) {
      this.error(), this.allErrors || this.gen.if(!1);
      return;
    }
    this.gen.if(t), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  fail$data(t) {
    if (!this.$data)
      return this.fail(t);
    const { schemaCode: r } = this;
    this.fail((0, F._)`${r} !== undefined && (${(0, F.or)(this.invalid$data(), t)})`);
  }
  error(t, r, n) {
    if (r) {
      this.setParams(r), this._error(t, n), this.setParams({});
      return;
    }
    this._error(t, n);
  }
  _error(t, r) {
    (t ? Hr.reportExtraError : Hr.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, Hr.reportError)(this, this.def.$dataError || Hr.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, Hr.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(t) {
    this.allErrors || this.gen.if(t);
  }
  setParams(t, r) {
    r ? Object.assign(this.params, t) : this.params = t;
  }
  block$data(t, r, n = F.nil) {
    this.gen.block(() => {
      this.check$data(t, n), r();
    });
  }
  check$data(t = F.nil, r = F.nil) {
    if (!this.$data)
      return;
    const { gen: n, schemaCode: s, schemaType: a, def: o } = this;
    n.if((0, F.or)((0, F._)`${s} === undefined`, r)), t !== F.nil && n.assign(t, !0), (a.length || o.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), t !== F.nil && n.assign(t, !1)), n.else();
  }
  invalid$data() {
    const { gen: t, schemaCode: r, schemaType: n, def: s, it: a } = this;
    return (0, F.or)(o(), u());
    function o() {
      if (n.length) {
        if (!(r instanceof F.Name))
          throw new Error("ajv implementation error");
        const c = Array.isArray(n) ? n : [n];
        return (0, F._)`${(0, Qn.checkDataTypes)(c, r, a.opts.strictNumbers, Qn.DataType.Wrong)}`;
      }
      return F.nil;
    }
    function u() {
      if (s.validateSchema) {
        const c = t.scopeValue("validate$data", { ref: s.validateSchema });
        return (0, F._)`!${c}(${r})`;
      }
      return F.nil;
    }
  }
  subschema(t, r) {
    const n = (0, Is.getSubschema)(this.it, t);
    (0, Is.extendSubschemaData)(n, this.it, t), (0, Is.extendSubschemaMode)(n, t);
    const s = { ...this.it, ...n, items: void 0, props: void 0 };
    return uh(s, r), s;
  }
  mergeEvaluated(t, r) {
    const { it: n, gen: s } = this;
    n.opts.unevaluated && (n.props !== !0 && t.props !== void 0 && (n.props = ht.mergeEvaluated.props(s, t.props, n.props, r)), n.items !== !0 && t.items !== void 0 && (n.items = ht.mergeEvaluated.items(s, t.items, n.items, r)));
  }
  mergeValidEvaluated(t, r) {
    const { it: n, gen: s } = this;
    if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0))
      return s.if(r, () => this.mergeEvaluated(t, F.Name)), !0;
  }
};
Ze.KeywordCxt = kl;
function Cl(e, t, r, n) {
  const s = new kl(e, r, t);
  "code" in r ? r.code(s, n) : s.$data && r.validate ? (0, xr.funcKeywordCode)(s, r) : "macro" in r ? (0, xr.macroKeywordCode)(s, r) : (r.compile || r.validate) && (0, xr.funcKeywordCode)(s, r);
}
const Sh = /^\/(?:[^~]|~0|~1)*$/, Ph = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function Dl(e, { dataLevel: t, dataNames: r, dataPathArr: n }) {
  let s, a;
  if (e === "")
    return G.default.rootData;
  if (e[0] === "/") {
    if (!Sh.test(e))
      throw new Error(`Invalid JSON-pointer: ${e}`);
    s = e, a = G.default.rootData;
  } else {
    const d = Ph.exec(e);
    if (!d)
      throw new Error(`Invalid JSON-pointer: ${e}`);
    const l = +d[1];
    if (s = d[2], s === "#") {
      if (l >= t)
        throw new Error(c("property/index", l));
      return n[t - l];
    }
    if (l > t)
      throw new Error(c("data", l));
    if (a = r[t - l], !s)
      return a;
  }
  let o = a;
  const u = s.split("/");
  for (const d of u)
    d && (a = (0, F._)`${a}${(0, F.getProperty)((0, ht.unescapeJsonPointer)(d))}`, o = (0, F._)`${o} && ${a}`);
  return o;
  function c(d, l) {
    return `Cannot access ${d} ${l} levels up, current level is ${t}`;
  }
}
Ze.getData = Dl;
var hn = {};
Object.defineProperty(hn, "__esModule", { value: !0 });
class Nh extends Error {
  constructor(t) {
    super("validation failed"), this.errors = t, this.ajv = this.validation = !0;
  }
}
hn.default = Nh;
var kr = {};
Object.defineProperty(kr, "__esModule", { value: !0 });
const Ts = ve;
let Rh = class extends Error {
  constructor(t, r, n, s) {
    super(s || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, Ts.resolveUrl)(t, r, n), this.missingSchema = (0, Ts.normalizeId)((0, Ts.getFullPath)(t, this.missingRef));
  }
};
kr.default = Rh;
var Ae = {};
Object.defineProperty(Ae, "__esModule", { value: !0 });
Ae.resolveSchema = Ae.getCompilingSchema = Ae.resolveRef = Ae.compileSchema = Ae.SchemaEnv = void 0;
const Be = W, Oh = hn, Jt = ze, Ye = ve, Ci = k, Ih = Ze;
let ls = class {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, Ye.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
};
Ae.SchemaEnv = ls;
function Oa(e) {
  const t = Ml.call(this, e);
  if (t)
    return t;
  const r = (0, Ye.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new Be.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let u;
  e.$async && (u = o.scopeValue("Error", {
    ref: Oh.default,
    code: (0, Be._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = o.scopeName("validate");
  e.validateName = c;
  const d = {
    gen: o,
    allErrors: this.opts.allErrors,
    data: Jt.default.data,
    parentData: Jt.default.parentData,
    parentDataProperty: Jt.default.parentDataProperty,
    dataNames: [Jt.default.data],
    dataPathArr: [Be.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: o.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, Be.stringify)(e.schema) } : { ref: e.schema }),
    validateName: c,
    ValidationError: u,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: Be.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, Be._)`""`,
    opts: this.opts,
    self: this
  };
  let l;
  try {
    this._compilations.add(e), (0, Ih.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    l = `${o.scopeRefs(Jt.default.scope)}return ${h}`, this.opts.code.process && (l = this.opts.code.process(l, e));
    const g = new Function(`${Jt.default.self}`, `${Jt.default.scope}`, l)(this, this.scope.get());
    if (this.scope.value(c, { ref: g }), g.errors = null, g.schema = e.schema, g.schemaEnv = e, e.$async && (g.$async = !0), this.opts.code.source === !0 && (g.source = { validateName: c, validateCode: h, scopeValues: o._values }), this.opts.unevaluated) {
      const { props: w, items: _ } = d;
      g.evaluated = {
        props: w instanceof Be.Name ? void 0 : w,
        items: _ instanceof Be.Name ? void 0 : _,
        dynamicProps: w instanceof Be.Name,
        dynamicItems: _ instanceof Be.Name
      }, g.source && (g.source.evaluated = (0, Be.stringify)(g.evaluated));
    }
    return e.validate = g, e;
  } catch (h) {
    throw delete e.validate, delete e.validateName, l && this.logger.error("Error compiling schema, function code:", l), h;
  } finally {
    this._compilations.delete(e);
  }
}
Ae.compileSchema = Oa;
function Th(e, t, r) {
  var n;
  r = (0, Ye.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = kh.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: u } = this.opts;
    o && (a = new ls({ schema: o, schemaId: u, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = jh.call(this, a);
}
Ae.resolveRef = Th;
function jh(e) {
  return (0, Ye.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : Oa.call(this, e);
}
function Ml(e) {
  for (const t of this._compilations)
    if (Ah(t, e))
      return t;
}
Ae.getCompilingSchema = Ml;
function Ah(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function kh(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || us.call(this, e, t);
}
function us(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, Ye._getFullPath)(this.opts.uriResolver, r);
  let s = (0, Ye.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return js.call(this, r, e);
  const a = (0, Ye.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const u = us.call(this, e, o);
    return typeof (u == null ? void 0 : u.schema) != "object" ? void 0 : js.call(this, r, u);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || Oa.call(this, o), a === (0, Ye.normalizeId)(t)) {
      const { schema: u } = o, { schemaId: c } = this.opts, d = u[c];
      return d && (s = (0, Ye.resolveUrl)(this.opts.uriResolver, s, d)), new ls({ schema: u, schemaId: c, root: e, baseId: s });
    }
    return js.call(this, r, o);
  }
}
Ae.resolveSchema = us;
const Ch = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function js(e, { baseId: t, schema: r, root: n }) {
  var s;
  if (((s = e.fragment) === null || s === void 0 ? void 0 : s[0]) !== "/")
    return;
  for (const u of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, Ci.unescapeFragment)(u)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !Ch.has(u) && d && (t = (0, Ye.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, Ci.schemaHasRulesButRef)(r, this.RULES)) {
    const u = (0, Ye.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = us.call(this, n, u);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new ls({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const Dh = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", Mh = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Lh = "object", Vh = [
  "$data"
], Fh = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
}, zh = !1, Uh = {
  $id: Dh,
  description: Mh,
  type: Lh,
  required: Vh,
  properties: Fh,
  additionalProperties: zh
};
var Ia = {}, ds = { exports: {} };
const qh = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu), Ll = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u), Ta = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu), Vl = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu), Kh = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
function Fl(e) {
  let t = "", r = 0, n = 0;
  for (n = 0; n < e.length; n++)
    if (r = e[n].charCodeAt(0), r !== 48) {
      if (!(r >= 48 && r <= 57 || r >= 65 && r <= 70 || r >= 97 && r <= 102))
        return "";
      t += e[n];
      break;
    }
  for (n += 1; n < e.length; n++) {
    if (r = e[n].charCodeAt(0), !(r >= 48 && r <= 57 || r >= 65 && r <= 70 || r >= 97 && r <= 102))
      return "";
    t += e[n];
  }
  return t;
}
const Gh = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
function Di(e) {
  return e.length = 0, !0;
}
function Hh(e, t, r) {
  if (e.length) {
    const n = Fl(e);
    if (n !== "")
      t.push(n);
    else
      return r.error = !0, !1;
    e.length = 0;
  }
  return !0;
}
function Bh(e) {
  let t = 0;
  const r = { error: !1, address: "", zone: "" }, n = [], s = [];
  let a = !1, o = !1, u = Hh;
  for (let c = 0; c < e.length; c++) {
    const d = e[c];
    if (!(d === "[" || d === "]"))
      if (d === ":") {
        if (a === !0 && (o = !0), !u(s, n, r))
          break;
        if (++t > 7) {
          r.error = !0;
          break;
        }
        c > 0 && e[c - 1] === ":" && (a = !0), n.push(":");
        continue;
      } else if (d === "%") {
        if (!u(s, n, r))
          break;
        u = Di;
      } else {
        s.push(d);
        continue;
      }
  }
  return s.length && (u === Di ? r.zone = s.join("") : o ? n.push(s.join("")) : n.push(Fl(s))), r.address = n.join(""), r;
}
function zl(e) {
  if (Xh(e, ":") < 2)
    return { host: e, isIPV6: !1 };
  const t = Bh(e);
  if (t.error)
    return { host: e, isIPV6: !1 };
  {
    let r = t.address, n = t.address;
    return t.zone && (r += "%" + t.zone, n += "%25" + t.zone), { host: r, isIPV6: !0, escapedHost: n };
  }
}
function Xh(e, t) {
  let r = 0;
  for (let n = 0; n < e.length; n++)
    e[n] === t && r++;
  return r;
}
function Jh(e) {
  let t = e;
  const r = [];
  let n = -1, s = 0;
  for (; s = t.length; ) {
    if (s === 1) {
      if (t === ".")
        break;
      if (t === "/") {
        r.push("/");
        break;
      } else {
        r.push(t);
        break;
      }
    } else if (s === 2) {
      if (t[0] === ".") {
        if (t[1] === ".")
          break;
        if (t[1] === "/") {
          t = t.slice(2);
          continue;
        }
      } else if (t[0] === "/" && (t[1] === "." || t[1] === "/")) {
        r.push("/");
        break;
      }
    } else if (s === 3 && t === "/..") {
      r.length !== 0 && r.pop(), r.push("/");
      break;
    }
    if (t[0] === ".") {
      if (t[1] === ".") {
        if (t[2] === "/") {
          t = t.slice(3);
          continue;
        }
      } else if (t[1] === "/") {
        t = t.slice(2);
        continue;
      }
    } else if (t[0] === "/" && t[1] === ".") {
      if (t[2] === "/") {
        t = t.slice(2);
        continue;
      } else if (t[2] === "." && t[3] === "/") {
        t = t.slice(3), r.length !== 0 && r.pop();
        continue;
      }
    }
    if ((n = t.indexOf("/", 1)) === -1) {
      r.push(t);
      break;
    } else
      r.push(t.slice(0, n)), t = t.slice(n);
  }
  return r.join("");
}
const Wh = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" }, Yh = /[@/?#:]/g, Qh = /[@/?#]/g;
function Ul(e, t) {
  const r = t ? Qh : Yh;
  return r.lastIndex = 0, e.replace(r, (n) => Wh[n]);
}
function Zh(e, t = !1) {
  if (e.indexOf("%") === -1)
    return e;
  let r = "";
  for (let n = 0; n < e.length; n++) {
    if (e[n] === "%" && n + 2 < e.length) {
      const s = e.slice(n + 1, n + 3);
      if (Ta(s)) {
        const a = s.toUpperCase(), o = String.fromCharCode(parseInt(a, 16));
        t && Vl(o) ? r += o : r += "%" + a, n += 2;
        continue;
      }
    }
    r += e[n];
  }
  return r;
}
function xh(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (Ta(n)) {
        const s = n.toUpperCase(), a = String.fromCharCode(parseInt(s, 16));
        a !== "." && Vl(a) ? t += a : t += "%" + s, r += 2;
        continue;
      }
    }
    Kh(e[r]) ? t += e[r] : t += escape(e[r]);
  }
  return t;
}
function em(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (Ta(n)) {
        t += "%" + n.toUpperCase(), r += 2;
        continue;
      }
    }
    t += escape(e[r]);
  }
  return t;
}
function tm(e) {
  const t = [];
  if (e.userinfo !== void 0 && (t.push(e.userinfo), t.push("@")), e.host !== void 0) {
    let r = unescape(e.host);
    if (!Ll(r)) {
      const n = zl(r);
      n.isIPV6 === !0 ? r = `[${n.escapedHost}]` : r = Ul(r, !1);
    }
    t.push(r);
  }
  return (typeof e.port == "number" || typeof e.port == "string") && (t.push(":"), t.push(String(e.port))), t.length ? t.join("") : void 0;
}
var ql = {
  nonSimpleDomain: Gh,
  recomposeAuthority: tm,
  reescapeHostDelimiters: Ul,
  normalizePercentEncoding: Zh,
  normalizePathEncoding: xh,
  escapePreservingEscapes: em,
  removeDotSegments: Jh,
  isIPv4: Ll,
  isUUID: qh,
  normalizeIPv6: zl
};
const { isUUID: rm } = ql, nm = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function Kl(e) {
  return e.secure === !0 ? !0 : e.secure === !1 ? !1 : e.scheme ? e.scheme.length === 3 && (e.scheme[0] === "w" || e.scheme[0] === "W") && (e.scheme[1] === "s" || e.scheme[1] === "S") && (e.scheme[2] === "s" || e.scheme[2] === "S") : !1;
}
function Gl(e) {
  return e.host || (e.error = e.error || "HTTP URIs must have a host."), e;
}
function Hl(e) {
  const t = String(e.scheme).toLowerCase() === "https";
  return (e.port === (t ? 443 : 80) || e.port === "") && (e.port = void 0), e.path || (e.path = "/"), e;
}
function sm(e) {
  return e.secure = Kl(e), e.resourceName = (e.path || "/") + (e.query ? "?" + e.query : ""), e.path = void 0, e.query = void 0, e;
}
function am(e) {
  if ((e.port === (Kl(e) ? 443 : 80) || e.port === "") && (e.port = void 0), typeof e.secure == "boolean" && (e.scheme = e.secure ? "wss" : "ws", e.secure = void 0), e.resourceName) {
    const [t, r] = e.resourceName.split("?");
    e.path = t && t !== "/" ? t : void 0, e.query = r, e.resourceName = void 0;
  }
  return e.fragment = void 0, e;
}
function om(e, t) {
  if (!e.path)
    return e.error = "URN can not be parsed", e;
  const r = e.path.match(nm);
  if (r) {
    const n = t.scheme || e.scheme || "urn";
    e.nid = r[1].toLowerCase(), e.nss = r[2];
    const s = `${n}:${t.nid || e.nid}`, a = ja(s);
    e.path = void 0, a && (e = a.parse(e, t));
  } else
    e.error = e.error || "URN can not be parsed.";
  return e;
}
function im(e, t) {
  if (e.nid === void 0)
    throw new Error("URN without nid cannot be serialized");
  const r = t.scheme || e.scheme || "urn", n = e.nid.toLowerCase(), s = `${r}:${t.nid || n}`, a = ja(s);
  a && (e = a.serialize(e, t));
  const o = e, u = e.nss;
  return o.path = `${n || t.nid}:${u}`, t.skipEscape = !0, o;
}
function cm(e, t) {
  const r = e;
  return r.uuid = r.nss, r.nss = void 0, !t.tolerant && (!r.uuid || !rm(r.uuid)) && (r.error = r.error || "UUID is not valid."), r;
}
function lm(e) {
  const t = e;
  return t.nss = (e.uuid || "").toLowerCase(), t;
}
const Bl = (
  /** @type {SchemeHandler} */
  {
    scheme: "http",
    domainHost: !0,
    parse: Gl,
    serialize: Hl
  }
), um = (
  /** @type {SchemeHandler} */
  {
    scheme: "https",
    domainHost: Bl.domainHost,
    parse: Gl,
    serialize: Hl
  }
), Un = (
  /** @type {SchemeHandler} */
  {
    scheme: "ws",
    domainHost: !0,
    parse: sm,
    serialize: am
  }
), dm = (
  /** @type {SchemeHandler} */
  {
    scheme: "wss",
    domainHost: Un.domainHost,
    parse: Un.parse,
    serialize: Un.serialize
  }
), fm = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn",
    parse: om,
    serialize: im,
    skipNormalize: !0
  }
), hm = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn:uuid",
    parse: cm,
    serialize: lm,
    skipNormalize: !0
  }
), Zn = (
  /** @type {Record<SchemeName, SchemeHandler>} */
  {
    http: Bl,
    https: um,
    ws: Un,
    wss: dm,
    urn: fm,
    "urn:uuid": hm
  }
);
Object.setPrototypeOf(Zn, null);
function ja(e) {
  return e && (Zn[
    /** @type {SchemeName} */
    e
  ] || Zn[
    /** @type {SchemeName} */
    e.toLowerCase()
  ]) || void 0;
}
var mm = {
  SCHEMES: Zn,
  getSchemeHandler: ja
};
const { normalizeIPv6: pm, removeDotSegments: Wr, recomposeAuthority: $m, normalizePercentEncoding: ym, normalizePathEncoding: gm, escapePreservingEscapes: _m, reescapeHostDelimiters: vm, isIPv4: wm, nonSimpleDomain: Em } = ql, { SCHEMES: bm, getSchemeHandler: Xl } = mm;
function Sm(e, t) {
  return typeof e == "string" ? e = /** @type {T} */
  Im(e, t) : typeof e == "object" && (e = /** @type {T} */
  Ir(cr(e, t), t)), e;
}
function Pm(e, t, r) {
  const n = r ? Object.assign({ scheme: "null" }, r) : { scheme: "null" }, s = Jl(Ir(e, n), Ir(t, n), n, !0);
  return n.skipEscape = !0, cr(s, n);
}
function Jl(e, t, r, n) {
  const s = {};
  return n || (e = Ir(cr(e, r), r), t = Ir(cr(t, r), r)), r = r || {}, !r.tolerant && t.scheme ? (s.scheme = t.scheme, s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = Wr(t.path || ""), s.query = t.query) : (t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0 ? (s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = Wr(t.path || ""), s.query = t.query) : (t.path ? (t.path[0] === "/" ? s.path = Wr(t.path) : ((e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0) && !e.path ? s.path = "/" + t.path : e.path ? s.path = e.path.slice(0, e.path.lastIndexOf("/") + 1) + t.path : s.path = t.path, s.path = Wr(s.path)), s.query = t.query) : (s.path = e.path, t.query !== void 0 ? s.query = t.query : s.query = e.query), s.userinfo = e.userinfo, s.host = e.host, s.port = e.port), s.scheme = e.scheme), s.fragment = t.fragment, s;
}
function Nm(e, t, r) {
  const n = Mi(e, r), s = Mi(t, r);
  return n !== void 0 && s !== void 0 && n.toLowerCase() === s.toLowerCase();
}
function cr(e, t) {
  const r = {
    host: e.host,
    scheme: e.scheme,
    userinfo: e.userinfo,
    port: e.port,
    path: e.path,
    query: e.query,
    nid: e.nid,
    nss: e.nss,
    uuid: e.uuid,
    fragment: e.fragment,
    reference: e.reference,
    resourceName: e.resourceName,
    secure: e.secure,
    error: ""
  }, n = Object.assign({}, t), s = [], a = Xl(n.scheme || r.scheme);
  a && a.serialize && a.serialize(r, n), r.path !== void 0 && (n.skipEscape ? r.path = ym(r.path) : (r.path = _m(r.path), r.scheme !== void 0 && (r.path = r.path.split("%3A").join(":")))), n.reference !== "suffix" && r.scheme && s.push(r.scheme, ":");
  const o = $m(r);
  if (o !== void 0 && (n.reference !== "suffix" && s.push("//"), s.push(o), r.path && r.path[0] !== "/" && s.push("/")), r.path !== void 0) {
    let u = r.path;
    !n.absolutePath && (!a || !a.absolutePath) && (u = Wr(u)), o === void 0 && u[0] === "/" && u[1] === "/" && (u = "/%2F" + u.slice(2)), s.push(u);
  }
  return r.query !== void 0 && s.push("?", r.query), r.fragment !== void 0 && s.push("#", r.fragment), s.join("");
}
const Rm = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function Om(e, t) {
  if (t[2] !== void 0 && e.path && e.path[0] !== "/")
    return 'URI path must start with "/" when authority is present.';
  if (typeof e.port == "number" && (e.port < 0 || e.port > 65535))
    return "URI port is malformed.";
}
function Wl(e, t) {
  const r = Object.assign({}, t), n = {
    scheme: void 0,
    userinfo: void 0,
    host: "",
    port: void 0,
    path: "",
    query: void 0,
    fragment: void 0
  };
  let s = !1, a = !1;
  r.reference === "suffix" && (r.scheme ? e = r.scheme + ":" + e : e = "//" + e);
  const o = e.match(Rm);
  if (o) {
    n.scheme = o[1], n.userinfo = o[3], n.host = o[4], n.port = parseInt(o[5], 10), n.path = o[6] || "", n.query = o[7], n.fragment = o[8], isNaN(n.port) && (n.port = o[5]);
    const u = Om(n, o);
    if (u !== void 0 && (n.error = n.error || u, s = !0), n.host)
      if (wm(n.host) === !1) {
        const l = pm(n.host);
        n.host = l.host.toLowerCase(), a = l.isIPV6;
      } else
        a = !0;
    n.scheme === void 0 && n.userinfo === void 0 && n.host === void 0 && n.port === void 0 && n.query === void 0 && !n.path ? n.reference = "same-document" : n.scheme === void 0 ? n.reference = "relative" : n.fragment === void 0 ? n.reference = "absolute" : n.reference = "uri", r.reference && r.reference !== "suffix" && r.reference !== n.reference && (n.error = n.error || "URI is not a " + r.reference + " reference.");
    const c = Xl(r.scheme || n.scheme);
    if (!r.unicodeSupport && (!c || !c.unicodeSupport) && n.host && (r.domainHost || c && c.domainHost) && a === !1 && Em(n.host))
      try {
        n.host = new URL("http://" + n.host).hostname;
      } catch (d) {
        n.error = n.error || "Host's domain name can not be converted to ASCII: " + d;
      }
    if ((!c || c && !c.skipNormalize) && (e.indexOf("%") !== -1 && (n.scheme !== void 0 && (n.scheme = unescape(n.scheme)), n.host !== void 0 && (n.host = vm(unescape(n.host), a))), n.path && (n.path = gm(n.path)), n.fragment))
      try {
        n.fragment = encodeURI(decodeURIComponent(n.fragment));
      } catch {
        n.error = n.error || "URI malformed";
      }
    c && c.parse && c.parse(n, r);
  } else
    n.error = n.error || "URI can not be parsed.";
  return { parsed: n, malformedAuthorityOrPort: s };
}
function Ir(e, t) {
  return Wl(e, t).parsed;
}
function Im(e, t) {
  return Yl(e, t).normalized;
}
function Yl(e, t) {
  const { parsed: r, malformedAuthorityOrPort: n } = Wl(e, t);
  return {
    normalized: n ? e : cr(r, t),
    malformedAuthorityOrPort: n
  };
}
function Mi(e, t) {
  if (typeof e == "string") {
    const { normalized: r, malformedAuthorityOrPort: n } = Yl(e, t);
    return n ? void 0 : r;
  }
  if (typeof e == "object")
    return cr(e, t);
}
const Aa = {
  SCHEMES: bm,
  normalize: Sm,
  resolve: Pm,
  resolveComponent: Jl,
  equal: Nm,
  serialize: cr,
  parse: Ir
};
ds.exports = Aa;
ds.exports.default = Aa;
ds.exports.fastUri = Aa;
var Ql = ds.exports;
Object.defineProperty(Ia, "__esModule", { value: !0 });
const Zl = Ql;
Zl.code = 'require("ajv/dist/runtime/uri").default';
Ia.default = Zl;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = Ze;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return t.KeywordCxt;
  } });
  var r = W;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return r._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return r.str;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return r.stringify;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return r.nil;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return r.Name;
  } }), Object.defineProperty(e, "CodeGen", { enumerable: !0, get: function() {
    return r.CodeGen;
  } });
  const n = hn, s = kr, a = ir, o = Ae, u = W, c = ve, d = pe, l = k, h = Uh, S = Ia, g = (P, p) => new RegExp(P, p);
  g.code = "new RegExp";
  const w = ["removeAdditional", "useDefaults", "coerceTypes"], _ = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]), y = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  }, m = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  }, v = 200;
  function N(P) {
    var p, b, $, i, f, E, T, I, D, L, re, Ve, Ct, Dt, Mt, Lt, Vt, Ft, zt, Ut, qt, Kt, Gt, Ht, Bt;
    const Ge = P.strict, Xt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, Ur = Xt === !0 || Xt === void 0 ? 1 : Xt || 0, qr = ($ = (b = P.code) === null || b === void 0 ? void 0 : b.regExp) !== null && $ !== void 0 ? $ : g, Ss = (i = P.uriResolver) !== null && i !== void 0 ? i : S.default;
    return {
      strictSchema: (E = (f = P.strictSchema) !== null && f !== void 0 ? f : Ge) !== null && E !== void 0 ? E : !0,
      strictNumbers: (I = (T = P.strictNumbers) !== null && T !== void 0 ? T : Ge) !== null && I !== void 0 ? I : !0,
      strictTypes: (L = (D = P.strictTypes) !== null && D !== void 0 ? D : Ge) !== null && L !== void 0 ? L : "log",
      strictTuples: (Ve = (re = P.strictTuples) !== null && re !== void 0 ? re : Ge) !== null && Ve !== void 0 ? Ve : "log",
      strictRequired: (Dt = (Ct = P.strictRequired) !== null && Ct !== void 0 ? Ct : Ge) !== null && Dt !== void 0 ? Dt : !1,
      code: P.code ? { ...P.code, optimize: Ur, regExp: qr } : { optimize: Ur, regExp: qr },
      loopRequired: (Mt = P.loopRequired) !== null && Mt !== void 0 ? Mt : v,
      loopEnum: (Lt = P.loopEnum) !== null && Lt !== void 0 ? Lt : v,
      meta: (Vt = P.meta) !== null && Vt !== void 0 ? Vt : !0,
      messages: (Ft = P.messages) !== null && Ft !== void 0 ? Ft : !0,
      inlineRefs: (zt = P.inlineRefs) !== null && zt !== void 0 ? zt : !0,
      schemaId: (Ut = P.schemaId) !== null && Ut !== void 0 ? Ut : "$id",
      addUsedSchema: (qt = P.addUsedSchema) !== null && qt !== void 0 ? qt : !0,
      validateSchema: (Kt = P.validateSchema) !== null && Kt !== void 0 ? Kt : !0,
      validateFormats: (Gt = P.validateFormats) !== null && Gt !== void 0 ? Gt : !0,
      unicodeRegExp: (Ht = P.unicodeRegExp) !== null && Ht !== void 0 ? Ht : !0,
      int32range: (Bt = P.int32range) !== null && Bt !== void 0 ? Bt : !0,
      uriResolver: Ss
    };
  }
  class R {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = /* @__PURE__ */ Object.create(null), this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...N(p) };
      const { es5: b, lines: $ } = this.opts.code;
      this.scope = new u.ValueScope({ scope: {}, prefixes: _, es5: b, lines: $ }), this.logger = q(p.logger);
      const i = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, a.getRules)(), O.call(this, y, p, "NOT SUPPORTED"), O.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = me.call(this), p.formats && le.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && de.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), B.call(this), p.validateFormats = i;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: b, schemaId: $ } = this.opts;
      let i = h;
      $ === "id" && (i = { ...h }, i.id = i.$id, delete i.$id), b && p && this.addMetaSchema(i, i[$], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: b } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[b] || p : void 0;
    }
    validate(p, b) {
      let $;
      if (typeof p == "string") {
        if ($ = this.getSchema(p), !$)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        $ = this.compile(p);
      const i = $(b);
      return "$async" in $ || (this.errors = $.errors), i;
    }
    compile(p, b) {
      const $ = this._addSchema(p, b);
      return $.validate || this._compileSchemaEnv($);
    }
    compileAsync(p, b) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: $ } = this.opts;
      return i.call(this, p, b);
      async function i(L, re) {
        await f.call(this, L.$schema);
        const Ve = this._addSchema(L, re);
        return Ve.validate || E.call(this, Ve);
      }
      async function f(L) {
        L && !this.getSchema(L) && await i.call(this, { $ref: L }, !0);
      }
      async function E(L) {
        try {
          return this._compileSchemaEnv(L);
        } catch (re) {
          if (!(re instanceof s.default))
            throw re;
          return T.call(this, re), await I.call(this, re.missingSchema), E.call(this, L);
        }
      }
      function T({ missingSchema: L, missingRef: re }) {
        if (this.refs[L])
          throw new Error(`AnySchema ${L} is loaded but ${re} cannot be resolved`);
      }
      async function I(L) {
        const re = await D.call(this, L);
        this.refs[L] || await f.call(this, re.$schema), this.refs[L] || this.addSchema(re, L, b);
      }
      async function D(L) {
        const re = this._loading[L];
        if (re)
          return re;
        try {
          return await (this._loading[L] = $(L));
        } finally {
          delete this._loading[L];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, b, $, i = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const E of p)
          this.addSchema(E, void 0, $, i);
        return this;
      }
      let f;
      if (typeof p == "object") {
        const { schemaId: E } = this.opts;
        if (f = p[E], f !== void 0 && typeof f != "string")
          throw new Error(`schema ${E} must be string`);
      }
      return b = (0, c.normalizeId)(b || f), this._checkUnique(b), this.schemas[b] = this._addSchema(p, $, b, i, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, b, $ = this.opts.validateSchema) {
      return this.addSchema(p, b, !0, $), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, b) {
      if (typeof p == "boolean")
        return !0;
      let $;
      if ($ = p.$schema, $ !== void 0 && typeof $ != "string")
        throw new Error("$schema must be a string");
      if ($ = $ || this.opts.defaultMeta || this.defaultMeta(), !$)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const i = this.validate($, p);
      if (!i && b) {
        const f = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(f);
        else
          throw new Error(f);
      }
      return i;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(p) {
      let b;
      for (; typeof (b = U.call(this, p)) == "string"; )
        p = b;
      if (b === void 0) {
        const { schemaId: $ } = this.opts, i = new o.SchemaEnv({ schema: {}, schemaId: $ });
        if (b = o.resolveSchema.call(this, i, p), !b)
          return;
        this.refs[p] = b;
      }
      return b.validate || this._compileSchemaEnv(b);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(p) {
      if (p instanceof RegExp)
        return this._removeAllSchemas(this.schemas, p), this._removeAllSchemas(this.refs, p), this;
      switch (typeof p) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          const b = U.call(this, p);
          return typeof b == "object" && this._cache.delete(b.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const b = p;
          this._cache.delete(b);
          let $ = p[this.opts.schemaId];
          return $ && ($ = (0, c.normalizeId)($), delete this.schemas[$], delete this.refs[$]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const b of p)
        this.addKeyword(b);
      return this;
    }
    addKeyword(p, b) {
      let $;
      if (typeof p == "string")
        $ = p, typeof b == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), b.keyword = $);
      else if (typeof p == "object" && b === void 0) {
        if (b = p, $ = b.keyword, Array.isArray($) && !$.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (K.call(this, $, b), !b)
        return (0, l.eachItem)($, (f) => oe.call(this, f)), this;
      A.call(this, b);
      const i = {
        ...b,
        type: (0, d.getJSONTypes)(b.type),
        schemaType: (0, d.getJSONTypes)(b.schemaType)
      };
      return (0, l.eachItem)($, i.type.length === 0 ? (f) => oe.call(this, f, i) : (f) => i.type.forEach((E) => oe.call(this, f, i, E))), this;
    }
    getKeyword(p) {
      const b = this.RULES.all[p];
      return typeof b == "object" ? b.definition : !!b;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: b } = this;
      delete b.keywords[p], delete b.all[p];
      for (const $ of b.rules) {
        const i = $.rules.findIndex((f) => f.keyword === p);
        i >= 0 && $.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, b) {
      return typeof b == "string" && (b = new RegExp(b)), this.formats[p] = b, this;
    }
    errorsText(p = this.errors, { separator: b = ", ", dataVar: $ = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((i) => `${$}${i.instancePath} ${i.message}`).reduce((i, f) => i + b + f);
    }
    $dataMetaSchema(p, b) {
      const $ = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const i of b) {
        const f = i.split("/").slice(1);
        let E = p;
        for (const T of f)
          E = E[T];
        for (const T in $) {
          const I = $[T];
          if (typeof I != "object")
            continue;
          const { $data: D } = I.definition, L = E[T];
          D && L && (E[T] = M(L));
        }
      }
      return p;
    }
    _removeAllSchemas(p, b) {
      for (const $ in p) {
        const i = p[$];
        (!b || b.test($)) && (typeof i == "string" ? delete p[$] : i && !i.meta && (this._cache.delete(i.schema), delete p[$]));
      }
    }
    _addSchema(p, b, $, i = this.opts.validateSchema, f = this.opts.addUsedSchema) {
      let E;
      const { schemaId: T } = this.opts;
      if (typeof p == "object")
        E = p[T];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let I = this._cache.get(p);
      if (I !== void 0)
        return I;
      $ = (0, c.normalizeId)(E || $);
      const D = c.getSchemaRefs.call(this, p, $);
      return I = new o.SchemaEnv({ schema: p, schemaId: T, meta: b, baseId: $, localRefs: D }), this._cache.set(I.schema, I), f && !$.startsWith("#") && ($ && this._checkUnique($), this.refs[$] = I), i && this.validateSchema(p, !0), I;
    }
    _checkUnique(p) {
      if (this.schemas[p] || this.refs[p])
        throw new Error(`schema with key or id "${p}" already exists`);
    }
    _compileSchemaEnv(p) {
      if (p.meta ? this._compileMetaSchema(p) : o.compileSchema.call(this, p), !p.validate)
        throw new Error("ajv implementation error");
      return p.validate;
    }
    _compileMetaSchema(p) {
      const b = this.opts;
      this.opts = this._metaOpts;
      try {
        o.compileSchema.call(this, p);
      } finally {
        this.opts = b;
      }
    }
  }
  R.ValidationError = n.default, R.MissingRefError = s.default, e.default = R;
  function O(P, p, b, $ = "error") {
    for (const i in P) {
      const f = i;
      f in p && this.logger[$](`${b}: option ${i}. ${P[f]}`);
    }
  }
  function U(P) {
    return P = (0, c.normalizeId)(P), this.schemas[P] || this.refs[P];
  }
  function B() {
    const P = this.opts.schemas;
    if (P)
      if (Array.isArray(P))
        this.addSchema(P);
      else
        for (const p in P)
          this.addSchema(P[p], p);
  }
  function le() {
    for (const P in this.opts.formats) {
      const p = this.opts.formats[P];
      p && this.addFormat(P, p);
    }
  }
  function de(P) {
    if (Array.isArray(P)) {
      this.addVocabulary(P);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const p in P) {
      const b = P[p];
      b.keyword || (b.keyword = p), this.addKeyword(b);
    }
  }
  function me() {
    const P = { ...this.opts };
    for (const p of w)
      delete P[p];
    return P;
  }
  const V = { log() {
  }, warn() {
  }, error() {
  } };
  function q(P) {
    if (P === !1)
      return V;
    if (P === void 0)
      return console;
    if (P.log && P.warn && P.error)
      return P;
    throw new Error("logger must implement log, warn and error methods");
  }
  const ne = /^[a-z_$][a-z0-9_$:-]*$/i;
  function K(P, p) {
    const { RULES: b } = this;
    if ((0, l.eachItem)(P, ($) => {
      if (b.keywords[$])
        throw new Error(`Keyword ${$} is already defined`);
      if (!ne.test($))
        throw new Error(`Keyword ${$} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function oe(P, p, b) {
    var $;
    const i = p == null ? void 0 : p.post;
    if (b && i)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: f } = this;
    let E = i ? f.post : f.rules.find(({ type: I }) => I === b);
    if (E || (E = { type: b, rules: [] }, f.rules.push(E)), f.keywords[P] = !0, !p)
      return;
    const T = {
      keyword: P,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? Ee.call(this, E, T, p.before) : E.rules.push(T), f.all[P] = T, ($ = p.implements) === null || $ === void 0 || $.forEach((I) => this.addKeyword(I));
  }
  function Ee(P, p, b) {
    const $ = P.rules.findIndex((i) => i.keyword === b);
    $ >= 0 ? P.rules.splice($, 0, p) : (P.rules.push(p), this.logger.warn(`rule ${b} is not defined`));
  }
  function A(P) {
    let { metaSchema: p } = P;
    p !== void 0 && (P.$data && this.opts.$data && (p = M(p)), P.validateSchema = this.compile(p, !0));
  }
  const j = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function M(P) {
    return { anyOf: [P, j] };
  }
})(al);
var ka = {}, Ca = {}, Da = {};
Object.defineProperty(Da, "__esModule", { value: !0 });
const Tm = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
Da.default = Tm;
var $t = {};
Object.defineProperty($t, "__esModule", { value: !0 });
$t.callRef = $t.getValidate = void 0;
const jm = kr, Li = ee, De = W, hr = ze, Vi = Ae, wn = k, Am = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: u, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const l = Vi.resolveRef.call(c, d, s, r);
    if (l === void 0)
      throw new jm.default(n.opts.uriResolver, s, r);
    if (l instanceof Vi.SchemaEnv)
      return S(l);
    return g(l);
    function h() {
      if (a === d)
        return qn(e, o, a, a.$async);
      const w = t.scopeValue("root", { ref: d });
      return qn(e, (0, De._)`${w}.validate`, d, d.$async);
    }
    function S(w) {
      const _ = xl(e, w);
      qn(e, _, w, w.$async);
    }
    function g(w) {
      const _ = t.scopeValue("schema", u.code.source === !0 ? { ref: w, code: (0, De.stringify)(w) } : { ref: w }), y = t.name("valid"), m = e.subschema({
        schema: w,
        dataTypes: [],
        schemaPath: De.nil,
        topSchemaRef: _,
        errSchemaPath: r
      }, y);
      e.mergeEvaluated(m), e.ok(y);
    }
  }
};
function xl(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, De._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
$t.getValidate = xl;
function qn(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: u, opts: c } = a, d = c.passContext ? hr.default.this : De.nil;
  n ? l() : h();
  function l() {
    if (!u.$async)
      throw new Error("async schema referenced by sync schema");
    const w = s.let("valid");
    s.try(() => {
      s.code((0, De._)`await ${(0, Li.callValidateCode)(e, t, d)}`), g(t), o || s.assign(w, !0);
    }, (_) => {
      s.if((0, De._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), S(_), o || s.assign(w, !1);
    }), e.ok(w);
  }
  function h() {
    e.result((0, Li.callValidateCode)(e, t, d), () => g(t), () => S(t));
  }
  function S(w) {
    const _ = (0, De._)`${w}.errors`;
    s.assign(hr.default.vErrors, (0, De._)`${hr.default.vErrors} === null ? ${_} : ${hr.default.vErrors}.concat(${_})`), s.assign(hr.default.errors, (0, De._)`${hr.default.vErrors}.length`);
  }
  function g(w) {
    var _;
    if (!a.opts.unevaluated)
      return;
    const y = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (a.props !== !0)
      if (y && !y.dynamicProps)
        y.props !== void 0 && (a.props = wn.mergeEvaluated.props(s, y.props, a.props));
      else {
        const m = s.var("props", (0, De._)`${w}.evaluated.props`);
        a.props = wn.mergeEvaluated.props(s, m, a.props, De.Name);
      }
    if (a.items !== !0)
      if (y && !y.dynamicItems)
        y.items !== void 0 && (a.items = wn.mergeEvaluated.items(s, y.items, a.items));
      else {
        const m = s.var("items", (0, De._)`${w}.evaluated.items`);
        a.items = wn.mergeEvaluated.items(s, m, a.items, De.Name);
      }
  }
}
$t.callRef = qn;
$t.default = Am;
Object.defineProperty(Ca, "__esModule", { value: !0 });
const km = Da, Cm = $t, Dm = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  km.default,
  Cm.default
];
Ca.default = Dm;
var Ma = {}, La = {};
Object.defineProperty(La, "__esModule", { value: !0 });
const xn = W, wt = xn.operators, es = {
  maximum: { okStr: "<=", ok: wt.LTE, fail: wt.GT },
  minimum: { okStr: ">=", ok: wt.GTE, fail: wt.LT },
  exclusiveMaximum: { okStr: "<", ok: wt.LT, fail: wt.GTE },
  exclusiveMinimum: { okStr: ">", ok: wt.GT, fail: wt.LTE }
}, Mm = {
  message: ({ keyword: e, schemaCode: t }) => (0, xn.str)`must be ${es[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, xn._)`{comparison: ${es[e].okStr}, limit: ${t}}`
}, Lm = {
  keyword: Object.keys(es),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Mm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, xn._)`${r} ${es[t].fail} ${n} || isNaN(${r})`);
  }
};
La.default = Lm;
var Va = {};
Object.defineProperty(Va, "__esModule", { value: !0 });
const en = W, Vm = {
  message: ({ schemaCode: e }) => (0, en.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, en._)`{multipleOf: ${e}}`
}, Fm = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Vm,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), u = a ? (0, en._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, en._)`${o} !== parseInt(${o})`;
    e.fail$data((0, en._)`(${n} === 0 || (${o} = ${r}/${n}, ${u}))`);
  }
};
Va.default = Fm;
var Fa = {}, za = {};
Object.defineProperty(za, "__esModule", { value: !0 });
function eu(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
za.default = eu;
eu.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(Fa, "__esModule", { value: !0 });
const Qt = W, zm = k, Um = za, qm = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, Qt.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, Qt._)`{limit: ${e}}`
}, Km = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: qm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? Qt.operators.GT : Qt.operators.LT, o = s.opts.unicode === !1 ? (0, Qt._)`${r}.length` : (0, Qt._)`${(0, zm.useFunc)(e.gen, Um.default)}(${r})`;
    e.fail$data((0, Qt._)`${o} ${a} ${n}`);
  }
};
Fa.default = Km;
var Ua = {};
Object.defineProperty(Ua, "__esModule", { value: !0 });
const Gm = ee, Hm = k, wr = W, Bm = {
  message: ({ schemaCode: e }) => (0, wr.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, wr._)`{pattern: ${e}}`
}, Xm = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Bm,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, u = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, wr._)`new RegExp` : (0, Hm.useFunc)(t, c), l = t.let("valid");
      t.try(() => t.assign(l, (0, wr._)`${d}(${a}, ${u}).test(${r})`), () => t.assign(l, !1)), e.fail$data((0, wr._)`!${l}`);
    } else {
      const c = (0, Gm.usePattern)(e, s);
      e.fail$data((0, wr._)`!${c}.test(${r})`);
    }
  }
};
Ua.default = Xm;
var qa = {};
Object.defineProperty(qa, "__esModule", { value: !0 });
const tn = W, Jm = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, tn.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, tn._)`{limit: ${e}}`
}, Wm = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Jm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? tn.operators.GT : tn.operators.LT;
    e.fail$data((0, tn._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
qa.default = Wm;
var Ka = {};
Object.defineProperty(Ka, "__esModule", { value: !0 });
const Br = ee, rn = W, Ym = k, Qm = {
  message: ({ params: { missingProperty: e } }) => (0, rn.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, rn._)`{missingProperty: ${e}}`
}, Zm = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Qm,
  code(e) {
    const { gen: t, schema: r, schemaCode: n, data: s, $data: a, it: o } = e, { opts: u } = o;
    if (!a && r.length === 0)
      return;
    const c = r.length >= u.loopRequired;
    if (o.allErrors ? d() : l(), u.strictRequired) {
      const g = e.parentSchema.properties, { definedProperties: w } = e.it;
      for (const _ of r)
        if ((g == null ? void 0 : g[_]) === void 0 && !w.has(_)) {
          const y = o.schemaEnv.baseId + o.errSchemaPath, m = `required property "${_}" is not defined at "${y}" (strictRequired)`;
          (0, Ym.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(rn.nil, h);
      else
        for (const g of r)
          (0, Br.checkReportMissingProp)(e, g);
    }
    function l() {
      const g = t.let("missing");
      if (c || a) {
        const w = t.let("valid", !0);
        e.block$data(w, () => S(g, w)), e.ok(w);
      } else
        t.if((0, Br.checkMissingProp)(e, r, g)), (0, Br.reportMissingProp)(e, g), t.else();
    }
    function h() {
      t.forOf("prop", n, (g) => {
        e.setParams({ missingProperty: g }), t.if((0, Br.noPropertyInData)(t, s, g, u.ownProperties), () => e.error());
      });
    }
    function S(g, w) {
      e.setParams({ missingProperty: g }), t.forOf(g, n, () => {
        t.assign(w, (0, Br.propertyInData)(t, s, g, u.ownProperties)), t.if((0, rn.not)(w), () => {
          e.error(), t.break();
        });
      }, rn.nil);
    }
  }
};
Ka.default = Zm;
var Ga = {};
Object.defineProperty(Ga, "__esModule", { value: !0 });
const nn = W, xm = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, nn.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, nn._)`{limit: ${e}}`
}, ep = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: xm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? nn.operators.GT : nn.operators.LT;
    e.fail$data((0, nn._)`${r}.length ${s} ${n}`);
  }
};
Ga.default = ep;
var Ha = {}, mn = {};
Object.defineProperty(mn, "__esModule", { value: !0 });
const tu = cs;
tu.code = 'require("ajv/dist/runtime/equal").default';
mn.default = tu;
Object.defineProperty(Ha, "__esModule", { value: !0 });
const As = pe, ge = W, tp = k, rp = mn, np = {
  message: ({ params: { i: e, j: t } }) => (0, ge.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, ge._)`{i: ${e}, j: ${t}}`
}, sp = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: np,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, parentSchema: a, schemaCode: o, it: u } = e;
    if (!n && !s)
      return;
    const c = t.let("valid"), d = a.items ? (0, As.getSchemaTypes)(a.items) : [];
    e.block$data(c, l, (0, ge._)`${o} === false`), e.ok(c);
    function l() {
      const w = t.let("i", (0, ge._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: w, j: _ }), t.assign(c, !0), t.if((0, ge._)`${w} > 1`, () => (h() ? S : g)(w, _));
    }
    function h() {
      return d.length > 0 && !d.some((w) => w === "object" || w === "array");
    }
    function S(w, _) {
      const y = t.name("item"), m = (0, As.checkDataTypes)(d, y, u.opts.strictNumbers, As.DataType.Wrong), v = t.const("indices", (0, ge._)`{}`);
      t.for((0, ge._)`;${w}--;`, () => {
        t.let(y, (0, ge._)`${r}[${w}]`), t.if(m, (0, ge._)`continue`), d.length > 1 && t.if((0, ge._)`typeof ${y} == "string"`, (0, ge._)`${y} += "_"`), t.if((0, ge._)`typeof ${v}[${y}] == "number"`, () => {
          t.assign(_, (0, ge._)`${v}[${y}]`), e.error(), t.assign(c, !1).break();
        }).code((0, ge._)`${v}[${y}] = ${w}`);
      });
    }
    function g(w, _) {
      const y = (0, tp.useFunc)(t, rp.default), m = t.name("outer");
      t.label(m).for((0, ge._)`;${w}--;`, () => t.for((0, ge._)`${_} = ${w}; ${_}--;`, () => t.if((0, ge._)`${y}(${r}[${w}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Ha.default = sp;
var Ba = {};
Object.defineProperty(Ba, "__esModule", { value: !0 });
const ta = W, ap = k, op = mn, ip = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, ta._)`{allowedValue: ${e}}`
}, cp = {
  keyword: "const",
  $data: !0,
  error: ip,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, ta._)`!${(0, ap.useFunc)(t, op.default)}(${r}, ${s})`) : e.fail((0, ta._)`${a} !== ${r}`);
  }
};
Ba.default = cp;
var Xa = {};
Object.defineProperty(Xa, "__esModule", { value: !0 });
const Yr = W, lp = k, up = mn, dp = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Yr._)`{allowedValues: ${e}}`
}, fp = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: dp,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const u = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, lp.useFunc)(t, up.default));
    let l;
    if (u || n)
      l = t.let("valid"), e.block$data(l, h);
    else {
      if (!Array.isArray(s))
        throw new Error("ajv implementation error");
      const g = t.const("vSchema", a);
      l = (0, Yr.or)(...s.map((w, _) => S(g, _)));
    }
    e.pass(l);
    function h() {
      t.assign(l, !1), t.forOf("v", a, (g) => t.if((0, Yr._)`${d()}(${r}, ${g})`, () => t.assign(l, !0).break()));
    }
    function S(g, w) {
      const _ = s[w];
      return typeof _ == "object" && _ !== null ? (0, Yr._)`${d()}(${r}, ${g}[${w}])` : (0, Yr._)`${r} === ${_}`;
    }
  }
};
Xa.default = fp;
Object.defineProperty(Ma, "__esModule", { value: !0 });
const hp = La, mp = Va, pp = Fa, $p = Ua, yp = qa, gp = Ka, _p = Ga, vp = Ha, wp = Ba, Ep = Xa, bp = [
  // number
  hp.default,
  mp.default,
  // string
  pp.default,
  $p.default,
  // object
  yp.default,
  gp.default,
  // array
  _p.default,
  vp.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  wp.default,
  Ep.default
];
Ma.default = bp;
var Ja = {}, Cr = {};
Object.defineProperty(Cr, "__esModule", { value: !0 });
Cr.validateAdditionalItems = void 0;
const Zt = W, ra = k, Sp = {
  message: ({ params: { len: e } }) => (0, Zt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Zt._)`{limit: ${e}}`
}, Pp = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: Sp,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, ra.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    ru(e, n);
  }
};
function ru(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const u = r.const("len", (0, Zt._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, Zt._)`${u} <= ${t.length}`);
  else if (typeof n == "object" && !(0, ra.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, Zt._)`${u} <= ${t.length}`);
    r.if((0, Zt.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, u, (l) => {
      e.subschema({ keyword: a, dataProp: l, dataPropType: ra.Type.Num }, d), o.allErrors || r.if((0, Zt.not)(d), () => r.break());
    });
  }
}
Cr.validateAdditionalItems = ru;
Cr.default = Pp;
var Wa = {}, Dr = {};
Object.defineProperty(Dr, "__esModule", { value: !0 });
Dr.validateTuple = void 0;
const Fi = W, Kn = k, Np = ee, Rp = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return nu(e, "additionalItems", t);
    r.items = !0, !(0, Kn.alwaysValidSchema)(r, t) && e.ok((0, Np.validateArray)(e));
  }
};
function nu(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: u } = e;
  l(s), u.opts.unevaluated && r.length && u.items !== !0 && (u.items = Kn.mergeEvaluated.items(n, r.length, u.items));
  const c = n.name("valid"), d = n.const("len", (0, Fi._)`${a}.length`);
  r.forEach((h, S) => {
    (0, Kn.alwaysValidSchema)(u, h) || (n.if((0, Fi._)`${d} > ${S}`, () => e.subschema({
      keyword: o,
      schemaProp: S,
      dataProp: S
    }, c)), e.ok(c));
  });
  function l(h) {
    const { opts: S, errSchemaPath: g } = u, w = r.length, _ = w === h.minItems && (w === h.maxItems || h[t] === !1);
    if (S.strictTuples && !_) {
      const y = `"${o}" is ${w}-tuple, but minItems or maxItems/${t} are not specified or different at path "${g}"`;
      (0, Kn.checkStrictMode)(u, y, S.strictTuples);
    }
  }
}
Dr.validateTuple = nu;
Dr.default = Rp;
Object.defineProperty(Wa, "__esModule", { value: !0 });
const Op = Dr, Ip = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, Op.validateTuple)(e, "items")
};
Wa.default = Ip;
var Ya = {};
Object.defineProperty(Ya, "__esModule", { value: !0 });
const zi = W, Tp = k, jp = ee, Ap = Cr, kp = {
  message: ({ params: { len: e } }) => (0, zi.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, zi._)`{limit: ${e}}`
}, Cp = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: kp,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, Tp.alwaysValidSchema)(n, t) && (s ? (0, Ap.validateAdditionalItems)(e, s) : e.ok((0, jp.validateArray)(e)));
  }
};
Ya.default = Cp;
var Qa = {};
Object.defineProperty(Qa, "__esModule", { value: !0 });
const qe = W, En = k, Dp = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, qe.str)`must contain at least ${e} valid item(s)` : (0, qe.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, qe._)`{minContains: ${e}}` : (0, qe._)`{minContains: ${e}, maxContains: ${t}}`
}, Mp = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: Dp,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, u;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, u = d) : o = 1;
    const l = t.const("len", (0, qe._)`${s}.length`);
    if (e.setParams({ min: o, max: u }), u === void 0 && o === 0) {
      (0, En.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (u !== void 0 && o > u) {
      (0, En.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, En.alwaysValidSchema)(a, r)) {
      let _ = (0, qe._)`${l} >= ${o}`;
      u !== void 0 && (_ = (0, qe._)`${_} && ${l} <= ${u}`), e.pass(_);
      return;
    }
    a.items = !0;
    const h = t.name("valid");
    u === void 0 && o === 1 ? g(h, () => t.if(h, () => t.break())) : o === 0 ? (t.let(h, !0), u !== void 0 && t.if((0, qe._)`${s}.length > 0`, S)) : (t.let(h, !1), S()), e.result(h, () => e.reset());
    function S() {
      const _ = t.name("_valid"), y = t.let("count", 0);
      g(_, () => t.if(_, () => w(y)));
    }
    function g(_, y) {
      t.forRange("i", 0, l, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: En.Type.Num,
          compositeRule: !0
        }, _), y();
      });
    }
    function w(_) {
      t.code((0, qe._)`${_}++`), u === void 0 ? t.if((0, qe._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, qe._)`${_} > ${u}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, qe._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
Qa.default = Mp;
var fs = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
  const t = W, r = k, n = ee;
  e.error = {
    message: ({ params: { property: c, depsCount: d, deps: l } }) => {
      const h = d === 1 ? "property" : "properties";
      return (0, t.str)`must have ${h} ${l} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: l, missingProperty: h } }) => (0, t._)`{property: ${c},
    missingProperty: ${h},
    depsCount: ${d},
    deps: ${l}}`
    // TODO change to reference
  };
  const s = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: e.error,
    code(c) {
      const [d, l] = a(c);
      o(c, d), u(c, l);
    }
  };
  function a({ schema: c }) {
    const d = {}, l = {};
    for (const h in c) {
      if (h === "__proto__")
        continue;
      const S = Array.isArray(c[h]) ? d : l;
      S[h] = c[h];
    }
    return [d, l];
  }
  function o(c, d = c.schema) {
    const { gen: l, data: h, it: S } = c;
    if (Object.keys(d).length === 0)
      return;
    const g = l.let("missing");
    for (const w in d) {
      const _ = d[w];
      if (_.length === 0)
        continue;
      const y = (0, n.propertyInData)(l, h, w, S.opts.ownProperties);
      c.setParams({
        property: w,
        depsCount: _.length,
        deps: _.join(", ")
      }), S.allErrors ? l.if(y, () => {
        for (const m of _)
          (0, n.checkReportMissingProp)(c, m);
      }) : (l.if((0, t._)`${y} && (${(0, n.checkMissingProp)(c, _, g)})`), (0, n.reportMissingProp)(c, g), l.else());
    }
  }
  e.validatePropertyDeps = o;
  function u(c, d = c.schema) {
    const { gen: l, data: h, keyword: S, it: g } = c, w = l.name("valid");
    for (const _ in d)
      (0, r.alwaysValidSchema)(g, d[_]) || (l.if(
        (0, n.propertyInData)(l, h, _, g.opts.ownProperties),
        () => {
          const y = c.subschema({ keyword: S, schemaProp: _ }, w);
          c.mergeValidEvaluated(y, w);
        },
        () => l.var(w, !0)
        // TODO var
      ), c.ok(w));
  }
  e.validateSchemaDeps = u, e.default = s;
})(fs);
var Za = {};
Object.defineProperty(Za, "__esModule", { value: !0 });
const su = W, Lp = k, Vp = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, su._)`{propertyName: ${e.propertyName}}`
}, Fp = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: Vp,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, Lp.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, su.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
Za.default = Fp;
var hs = {};
Object.defineProperty(hs, "__esModule", { value: !0 });
const bn = ee, Je = W, zp = ze, Sn = k, Up = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, Je._)`{additionalProperty: ${e.additionalProperty}}`
}, qp = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: Up,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: u, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, Sn.alwaysValidSchema)(o, r))
      return;
    const d = (0, bn.allSchemaProperties)(n.properties), l = (0, bn.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, Je._)`${a} === ${zp.default.errors}`);
    function h() {
      t.forIn("key", s, (y) => {
        !d.length && !l.length ? w(y) : t.if(S(y), () => w(y));
      });
    }
    function S(y) {
      let m;
      if (d.length > 8) {
        const v = (0, Sn.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, bn.isOwnProperty)(t, v, y);
      } else d.length ? m = (0, Je.or)(...d.map((v) => (0, Je._)`${y} === ${v}`)) : m = Je.nil;
      return l.length && (m = (0, Je.or)(m, ...l.map((v) => (0, Je._)`${(0, bn.usePattern)(e, v)}.test(${y})`))), (0, Je.not)(m);
    }
    function g(y) {
      t.code((0, Je._)`delete ${s}[${y}]`);
    }
    function w(y) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        g(y);
        return;
      }
      if (r === !1) {
        e.setParams({ additionalProperty: y }), e.error(), u || t.break();
        return;
      }
      if (typeof r == "object" && !(0, Sn.alwaysValidSchema)(o, r)) {
        const m = t.name("valid");
        c.removeAdditional === "failing" ? (_(y, m, !1), t.if((0, Je.not)(m), () => {
          e.reset(), g(y);
        })) : (_(y, m), u || t.if((0, Je.not)(m), () => t.break()));
      }
    }
    function _(y, m, v) {
      const N = {
        keyword: "additionalProperties",
        dataProp: y,
        dataPropType: Sn.Type.Str
      };
      v === !1 && Object.assign(N, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(N, m);
    }
  }
};
hs.default = qp;
var xa = {};
Object.defineProperty(xa, "__esModule", { value: !0 });
const Kp = Ze, Ui = ee, ks = k, qi = hs, Gp = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && qi.default.code(new Kp.KeywordCxt(a, qi.default, "additionalProperties"));
    const o = (0, Ui.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = ks.mergeEvaluated.props(t, (0, ks.toHash)(o), a.props));
    const u = o.filter((h) => !(0, ks.alwaysValidSchema)(a, r[h]));
    if (u.length === 0)
      return;
    const c = t.name("valid");
    for (const h of u)
      d(h) ? l(h) : (t.if((0, Ui.propertyInData)(t, s, h, a.opts.ownProperties)), l(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
    function d(h) {
      return a.opts.useDefaults && !a.compositeRule && r[h].default !== void 0;
    }
    function l(h) {
      e.subschema({
        keyword: "properties",
        schemaProp: h,
        dataProp: h
      }, c);
    }
  }
};
xa.default = Gp;
var eo = {};
Object.defineProperty(eo, "__esModule", { value: !0 });
const Ki = ee, Pn = W, Gi = k, Hi = k, Hp = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, u = (0, Ki.allSchemaProperties)(r), c = u.filter((_) => (0, Gi.alwaysValidSchema)(a, r[_]));
    if (u.length === 0 || c.length === u.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, l = t.name("valid");
    a.props !== !0 && !(a.props instanceof Pn.Name) && (a.props = (0, Hi.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    S();
    function S() {
      for (const _ of u)
        d && g(_), a.allErrors ? w(_) : (t.var(l, !0), w(_), t.if(l));
    }
    function g(_) {
      for (const y in d)
        new RegExp(_).test(y) && (0, Gi.checkStrictMode)(a, `property ${y} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function w(_) {
      t.forIn("key", n, (y) => {
        t.if((0, Pn._)`${(0, Ki.usePattern)(e, _)}.test(${y})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: y,
            dataPropType: Hi.Type.Str
          }, l), a.opts.unevaluated && h !== !0 ? t.assign((0, Pn._)`${h}[${y}]`, !0) : !m && !a.allErrors && t.if((0, Pn.not)(l), () => t.break());
        });
      });
    }
  }
};
eo.default = Hp;
var to = {};
Object.defineProperty(to, "__esModule", { value: !0 });
const Bp = k, Xp = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, Bp.alwaysValidSchema)(n, r)) {
      e.fail();
      return;
    }
    const s = t.name("valid");
    e.subschema({
      keyword: "not",
      compositeRule: !0,
      createErrors: !1,
      allErrors: !1
    }, s), e.failResult(s, () => e.reset(), () => e.error());
  },
  error: { message: "must NOT be valid" }
};
to.default = Xp;
var ro = {};
Object.defineProperty(ro, "__esModule", { value: !0 });
const Jp = ee, Wp = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: Jp.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
ro.default = Wp;
var no = {};
Object.defineProperty(no, "__esModule", { value: !0 });
const Gn = W, Yp = k, Qp = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, Gn._)`{passingSchemas: ${e.passing}}`
}, Zp = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Qp,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, it: s } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (s.opts.discriminator && n.discriminator)
      return;
    const a = r, o = t.let("valid", !1), u = t.let("passing", null), c = t.name("_valid");
    e.setParams({ passing: u }), t.block(d), e.result(o, () => e.reset(), () => e.error(!0));
    function d() {
      a.forEach((l, h) => {
        let S;
        (0, Yp.alwaysValidSchema)(s, l) ? t.var(c, !0) : S = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, Gn._)`${c} && ${o}`).assign(o, !1).assign(u, (0, Gn._)`[${u}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(u, h), S && e.mergeEvaluated(S, Gn.Name);
        });
      });
    }
  }
};
no.default = Zp;
var so = {};
Object.defineProperty(so, "__esModule", { value: !0 });
const xp = k, e$ = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, xp.alwaysValidSchema)(n, a))
        return;
      const u = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(u);
    });
  }
};
so.default = e$;
var ao = {};
Object.defineProperty(ao, "__esModule", { value: !0 });
const ts = W, au = k, t$ = {
  message: ({ params: e }) => (0, ts.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, ts._)`{failingKeyword: ${e.ifClause}}`
}, r$ = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: t$,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, au.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = Bi(n, "then"), a = Bi(n, "else");
    if (!s && !a)
      return;
    const o = t.let("valid", !0), u = t.name("_valid");
    if (c(), e.reset(), s && a) {
      const l = t.let("ifClause");
      e.setParams({ ifClause: l }), t.if(u, d("then", l), d("else", l));
    } else s ? t.if(u, d("then")) : t.if((0, ts.not)(u), d("else"));
    e.pass(o, () => e.error(!0));
    function c() {
      const l = e.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, u);
      e.mergeEvaluated(l);
    }
    function d(l, h) {
      return () => {
        const S = e.subschema({ keyword: l }, u);
        t.assign(o, u), e.mergeValidEvaluated(S, o), h ? t.assign(h, (0, ts._)`${l}`) : e.setParams({ ifClause: l });
      };
    }
  }
};
function Bi(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, au.alwaysValidSchema)(e, r);
}
ao.default = r$;
var oo = {};
Object.defineProperty(oo, "__esModule", { value: !0 });
const n$ = k, s$ = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, n$.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
oo.default = s$;
Object.defineProperty(Ja, "__esModule", { value: !0 });
const a$ = Cr, o$ = Wa, i$ = Dr, c$ = Ya, l$ = Qa, u$ = fs, d$ = Za, f$ = hs, h$ = xa, m$ = eo, p$ = to, $$ = ro, y$ = no, g$ = so, _$ = ao, v$ = oo;
function w$(e = !1) {
  const t = [
    // any
    p$.default,
    $$.default,
    y$.default,
    g$.default,
    _$.default,
    v$.default,
    // object
    d$.default,
    f$.default,
    u$.default,
    h$.default,
    m$.default
  ];
  return e ? t.push(o$.default, c$.default) : t.push(a$.default, i$.default), t.push(l$.default), t;
}
Ja.default = w$;
var io = {}, Mr = {};
Object.defineProperty(Mr, "__esModule", { value: !0 });
Mr.dynamicAnchor = void 0;
const Cs = W, E$ = ze, Xi = Ae, b$ = $t, S$ = {
  keyword: "$dynamicAnchor",
  schemaType: "string",
  code: (e) => ou(e, e.schema)
};
function ou(e, t) {
  const { gen: r, it: n } = e;
  n.schemaEnv.root.dynamicAnchors[t] = !0;
  const s = (0, Cs._)`${E$.default.dynamicAnchors}${(0, Cs.getProperty)(t)}`, a = n.errSchemaPath === "#" ? n.validateName : P$(e);
  r.if((0, Cs._)`!${s}`, () => r.assign(s, a));
}
Mr.dynamicAnchor = ou;
function P$(e) {
  const { schemaEnv: t, schema: r, self: n } = e.it, { root: s, baseId: a, localRefs: o, meta: u } = t.root, { schemaId: c } = n.opts, d = new Xi.SchemaEnv({ schema: r, schemaId: c, root: s, baseId: a, localRefs: o, meta: u });
  return Xi.compileSchema.call(n, d), (0, b$.getValidate)(e, d);
}
Mr.default = S$;
var Lr = {};
Object.defineProperty(Lr, "__esModule", { value: !0 });
Lr.dynamicRef = void 0;
const Ji = W, N$ = ze, Wi = $t, R$ = {
  keyword: "$dynamicRef",
  schemaType: "string",
  code: (e) => iu(e, e.schema)
};
function iu(e, t) {
  const { gen: r, keyword: n, it: s } = e;
  if (t[0] !== "#")
    throw new Error(`"${n}" only supports hash fragment reference`);
  const a = t.slice(1);
  if (s.allErrors)
    o();
  else {
    const c = r.let("valid", !1);
    o(c), e.ok(c);
  }
  function o(c) {
    if (s.schemaEnv.root.dynamicAnchors[a]) {
      const d = r.let("_v", (0, Ji._)`${N$.default.dynamicAnchors}${(0, Ji.getProperty)(a)}`);
      r.if(d, u(d, c), u(s.validateName, c));
    } else
      u(s.validateName, c)();
  }
  function u(c, d) {
    return d ? () => r.block(() => {
      (0, Wi.callRef)(e, c), r.let(d, !0);
    }) : () => (0, Wi.callRef)(e, c);
  }
}
Lr.dynamicRef = iu;
Lr.default = R$;
var co = {};
Object.defineProperty(co, "__esModule", { value: !0 });
const O$ = Mr, I$ = k, T$ = {
  keyword: "$recursiveAnchor",
  schemaType: "boolean",
  code(e) {
    e.schema ? (0, O$.dynamicAnchor)(e, "") : (0, I$.checkStrictMode)(e.it, "$recursiveAnchor: false is ignored");
  }
};
co.default = T$;
var lo = {};
Object.defineProperty(lo, "__esModule", { value: !0 });
const j$ = Lr, A$ = {
  keyword: "$recursiveRef",
  schemaType: "string",
  code: (e) => (0, j$.dynamicRef)(e, e.schema)
};
lo.default = A$;
Object.defineProperty(io, "__esModule", { value: !0 });
const k$ = Mr, C$ = Lr, D$ = co, M$ = lo, L$ = [k$.default, C$.default, D$.default, M$.default];
io.default = L$;
var uo = {}, fo = {};
Object.defineProperty(fo, "__esModule", { value: !0 });
const Yi = fs, V$ = {
  keyword: "dependentRequired",
  type: "object",
  schemaType: "object",
  error: Yi.error,
  code: (e) => (0, Yi.validatePropertyDeps)(e)
};
fo.default = V$;
var ho = {};
Object.defineProperty(ho, "__esModule", { value: !0 });
const F$ = fs, z$ = {
  keyword: "dependentSchemas",
  type: "object",
  schemaType: "object",
  code: (e) => (0, F$.validateSchemaDeps)(e)
};
ho.default = z$;
var mo = {};
Object.defineProperty(mo, "__esModule", { value: !0 });
const U$ = k, q$ = {
  keyword: ["maxContains", "minContains"],
  type: "array",
  schemaType: "number",
  code({ keyword: e, parentSchema: t, it: r }) {
    t.contains === void 0 && (0, U$.checkStrictMode)(r, `"${e}" without "contains" is ignored`);
  }
};
mo.default = q$;
Object.defineProperty(uo, "__esModule", { value: !0 });
const K$ = fo, G$ = ho, H$ = mo, B$ = [K$.default, G$.default, H$.default];
uo.default = B$;
var po = {}, $o = {};
Object.defineProperty($o, "__esModule", { value: !0 });
const St = W, Qi = k, X$ = ze, J$ = {
  message: "must NOT have unevaluated properties",
  params: ({ params: e }) => (0, St._)`{unevaluatedProperty: ${e.unevaluatedProperty}}`
}, W$ = {
  keyword: "unevaluatedProperties",
  type: "object",
  schemaType: ["boolean", "object"],
  trackErrors: !0,
  error: J$,
  code(e) {
    const { gen: t, schema: r, data: n, errsCount: s, it: a } = e;
    if (!s)
      throw new Error("ajv implementation error");
    const { allErrors: o, props: u } = a;
    u instanceof St.Name ? t.if((0, St._)`${u} !== true`, () => t.forIn("key", n, (h) => t.if(d(u, h), () => c(h)))) : u !== !0 && t.forIn("key", n, (h) => u === void 0 ? c(h) : t.if(l(u, h), () => c(h))), a.props = !0, e.ok((0, St._)`${s} === ${X$.default.errors}`);
    function c(h) {
      if (r === !1) {
        e.setParams({ unevaluatedProperty: h }), e.error(), o || t.break();
        return;
      }
      if (!(0, Qi.alwaysValidSchema)(a, r)) {
        const S = t.name("valid");
        e.subschema({
          keyword: "unevaluatedProperties",
          dataProp: h,
          dataPropType: Qi.Type.Str
        }, S), o || t.if((0, St.not)(S), () => t.break());
      }
    }
    function d(h, S) {
      return (0, St._)`!${h} || !${h}[${S}]`;
    }
    function l(h, S) {
      const g = [];
      for (const w in h)
        h[w] === !0 && g.push((0, St._)`${S} !== ${w}`);
      return (0, St.and)(...g);
    }
  }
};
$o.default = W$;
var yo = {};
Object.defineProperty(yo, "__esModule", { value: !0 });
const xt = W, Zi = k, Y$ = {
  message: ({ params: { len: e } }) => (0, xt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, xt._)`{limit: ${e}}`
}, Q$ = {
  keyword: "unevaluatedItems",
  type: "array",
  schemaType: ["boolean", "object"],
  error: Y$,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e, a = s.items || 0;
    if (a === !0)
      return;
    const o = t.const("len", (0, xt._)`${n}.length`);
    if (r === !1)
      e.setParams({ len: a }), e.fail((0, xt._)`${o} > ${a}`);
    else if (typeof r == "object" && !(0, Zi.alwaysValidSchema)(s, r)) {
      const c = t.var("valid", (0, xt._)`${o} <= ${a}`);
      t.if((0, xt.not)(c), () => u(c, a)), e.ok(c);
    }
    s.items = !0;
    function u(c, d) {
      t.forRange("i", d, o, (l) => {
        e.subschema({ keyword: "unevaluatedItems", dataProp: l, dataPropType: Zi.Type.Num }, c), s.allErrors || t.if((0, xt.not)(c), () => t.break());
      });
    }
  }
};
yo.default = Q$;
Object.defineProperty(po, "__esModule", { value: !0 });
const Z$ = $o, x$ = yo, ey = [Z$.default, x$.default];
po.default = ey;
var go = {}, _o = {};
Object.defineProperty(_o, "__esModule", { value: !0 });
const fe = W, ty = {
  message: ({ schemaCode: e }) => (0, fe.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, fe._)`{format: ${e}}`
}, ry = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: ty,
  code(e, t) {
    const { gen: r, data: n, $data: s, schema: a, schemaCode: o, it: u } = e, { opts: c, errSchemaPath: d, schemaEnv: l, self: h } = u;
    if (!c.validateFormats)
      return;
    s ? S() : g();
    function S() {
      const w = r.scopeValue("formats", {
        ref: h.formats,
        code: c.code.formats
      }), _ = r.const("fDef", (0, fe._)`${w}[${o}]`), y = r.let("fType"), m = r.let("format");
      r.if((0, fe._)`typeof ${_} == "object" && !(${_} instanceof RegExp)`, () => r.assign(y, (0, fe._)`${_}.type || "string"`).assign(m, (0, fe._)`${_}.validate`), () => r.assign(y, (0, fe._)`"string"`).assign(m, _)), e.fail$data((0, fe.or)(v(), N()));
      function v() {
        return c.strictSchema === !1 ? fe.nil : (0, fe._)`${o} && !${m}`;
      }
      function N() {
        const R = l.$async ? (0, fe._)`(${_}.async ? await ${m}(${n}) : ${m}(${n}))` : (0, fe._)`${m}(${n})`, O = (0, fe._)`(typeof ${m} == "function" ? ${R} : ${m}.test(${n}))`;
        return (0, fe._)`${m} && ${m} !== true && ${y} === ${t} && !${O}`;
      }
    }
    function g() {
      const w = h.formats[a];
      if (!w) {
        v();
        return;
      }
      if (w === !0)
        return;
      const [_, y, m] = N(w);
      _ === t && e.pass(R());
      function v() {
        if (c.strictSchema === !1) {
          h.logger.warn(O());
          return;
        }
        throw new Error(O());
        function O() {
          return `unknown format "${a}" ignored in schema at path "${d}"`;
        }
      }
      function N(O) {
        const U = O instanceof RegExp ? (0, fe.regexpCode)(O) : c.code.formats ? (0, fe._)`${c.code.formats}${(0, fe.getProperty)(a)}` : void 0, B = r.scopeValue("formats", { key: a, ref: O, code: U });
        return typeof O == "object" && !(O instanceof RegExp) ? [O.type || "string", O.validate, (0, fe._)`${B}.validate`] : ["string", O, B];
      }
      function R() {
        if (typeof w == "object" && !(w instanceof RegExp) && w.async) {
          if (!l.$async)
            throw new Error("async format in sync schema");
          return (0, fe._)`await ${m}(${n})`;
        }
        return typeof y == "function" ? (0, fe._)`${m}(${n})` : (0, fe._)`${m}.test(${n})`;
      }
    }
  }
};
_o.default = ry;
Object.defineProperty(go, "__esModule", { value: !0 });
const ny = _o, sy = [ny.default];
go.default = sy;
var Tr = {};
Object.defineProperty(Tr, "__esModule", { value: !0 });
Tr.contentVocabulary = Tr.metadataVocabulary = void 0;
Tr.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
Tr.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(ka, "__esModule", { value: !0 });
const ay = Ca, oy = Ma, iy = Ja, cy = io, ly = uo, uy = po, dy = go, xi = Tr, fy = [
  cy.default,
  ay.default,
  oy.default,
  (0, iy.default)(!0),
  dy.default,
  xi.metadataVocabulary,
  xi.contentVocabulary,
  ly.default,
  uy.default
];
ka.default = fy;
var vo = {}, ms = {};
Object.defineProperty(ms, "__esModule", { value: !0 });
ms.DiscrError = void 0;
var ec;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(ec || (ms.DiscrError = ec = {}));
Object.defineProperty(vo, "__esModule", { value: !0 });
const yr = W, na = ms, tc = Ae, hy = kr, my = k, py = {
  message: ({ params: { discrError: e, tagName: t } }) => e === na.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, yr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, $y = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: py,
  code(e) {
    const { gen: t, data: r, schema: n, parentSchema: s, it: a } = e, { oneOf: o } = s;
    if (!a.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const u = n.propertyName;
    if (typeof u != "string")
      throw new Error("discriminator: requires propertyName");
    if (n.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!o)
      throw new Error("discriminator: requires oneOf keyword");
    const c = t.let("valid", !1), d = t.const("tag", (0, yr._)`${r}${(0, yr.getProperty)(u)}`);
    t.if((0, yr._)`typeof ${d} == "string"`, () => l(), () => e.error(!1, { discrError: na.DiscrError.Tag, tag: d, tagName: u })), e.ok(c);
    function l() {
      const g = S();
      t.if(!1);
      for (const w in g)
        t.elseIf((0, yr._)`${d} === ${w}`), t.assign(c, h(g[w]));
      t.else(), e.error(!1, { discrError: na.DiscrError.Mapping, tag: d, tagName: u }), t.endIf();
    }
    function h(g) {
      const w = t.name("valid"), _ = e.subschema({ keyword: "oneOf", schemaProp: g }, w);
      return e.mergeEvaluated(_, yr.Name), w;
    }
    function S() {
      var g;
      const w = {}, _ = m(s);
      let y = !0;
      for (let R = 0; R < o.length; R++) {
        let O = o[R];
        if (O != null && O.$ref && !(0, my.schemaHasRulesButRef)(O, a.self.RULES)) {
          const B = O.$ref;
          if (O = tc.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, B), O instanceof tc.SchemaEnv && (O = O.schema), O === void 0)
            throw new hy.default(a.opts.uriResolver, a.baseId, B);
        }
        const U = (g = O == null ? void 0 : O.properties) === null || g === void 0 ? void 0 : g[u];
        if (typeof U != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${u}"`);
        y = y && (_ || m(O)), v(U, R);
      }
      if (!y)
        throw new Error(`discriminator: "${u}" must be required`);
      return w;
      function m({ required: R }) {
        return Array.isArray(R) && R.includes(u);
      }
      function v(R, O) {
        if (R.const)
          N(R.const, O);
        else if (R.enum)
          for (const U of R.enum)
            N(U, O);
        else
          throw new Error(`discriminator: "properties/${u}" must have "const" or "enum"`);
      }
      function N(R, O) {
        if (typeof R != "string" || R in w)
          throw new Error(`discriminator: "${u}" values must be unique strings`);
        w[R] = O;
      }
    }
  }
};
vo.default = $y;
var wo = {};
const yy = "https://json-schema.org/draft/2020-12/schema", gy = "https://json-schema.org/draft/2020-12/schema", _y = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0,
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0,
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
  "https://json-schema.org/draft/2020-12/vocab/validation": !0,
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, vy = "meta", wy = "Core and Validation specifications meta-schema", Ey = [
  {
    $ref: "meta/core"
  },
  {
    $ref: "meta/applicator"
  },
  {
    $ref: "meta/unevaluated"
  },
  {
    $ref: "meta/validation"
  },
  {
    $ref: "meta/meta-data"
  },
  {
    $ref: "meta/format-annotation"
  },
  {
    $ref: "meta/content"
  }
], by = [
  "object",
  "boolean"
], Sy = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.", Py = {
  definitions: {
    $comment: '"definitions" has been replaced by "$defs".',
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    deprecated: !0,
    default: {}
  },
  dependencies: {
    $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $dynamicRef: "#meta"
        },
        {
          $ref: "meta/validation#/$defs/stringArray"
        }
      ]
    },
    deprecated: !0,
    default: {}
  },
  $recursiveAnchor: {
    $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
    $ref: "meta/core#/$defs/anchorString",
    deprecated: !0
  },
  $recursiveRef: {
    $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
    $ref: "meta/core#/$defs/uriReferenceString",
    deprecated: !0
  }
}, Ny = {
  $schema: yy,
  $id: gy,
  $vocabulary: _y,
  $dynamicAnchor: vy,
  title: wy,
  allOf: Ey,
  type: by,
  $comment: Sy,
  properties: Py
}, Ry = "https://json-schema.org/draft/2020-12/schema", Oy = "https://json-schema.org/draft/2020-12/meta/applicator", Iy = {
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0
}, Ty = "meta", jy = "Applicator vocabulary meta-schema", Ay = [
  "object",
  "boolean"
], ky = {
  prefixItems: {
    $ref: "#/$defs/schemaArray"
  },
  items: {
    $dynamicRef: "#meta"
  },
  contains: {
    $dynamicRef: "#meta"
  },
  additionalProperties: {
    $dynamicRef: "#meta"
  },
  properties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    default: {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    propertyNames: {
      format: "regex"
    },
    default: {}
  },
  dependentSchemas: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    },
    default: {}
  },
  propertyNames: {
    $dynamicRef: "#meta"
  },
  if: {
    $dynamicRef: "#meta"
  },
  then: {
    $dynamicRef: "#meta"
  },
  else: {
    $dynamicRef: "#meta"
  },
  allOf: {
    $ref: "#/$defs/schemaArray"
  },
  anyOf: {
    $ref: "#/$defs/schemaArray"
  },
  oneOf: {
    $ref: "#/$defs/schemaArray"
  },
  not: {
    $dynamicRef: "#meta"
  }
}, Cy = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $dynamicRef: "#meta"
    }
  }
}, Dy = {
  $schema: Ry,
  $id: Oy,
  $vocabulary: Iy,
  $dynamicAnchor: Ty,
  title: jy,
  type: Ay,
  properties: ky,
  $defs: Cy
}, My = "https://json-schema.org/draft/2020-12/schema", Ly = "https://json-schema.org/draft/2020-12/meta/unevaluated", Vy = {
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0
}, Fy = "meta", zy = "Unevaluated applicator vocabulary meta-schema", Uy = [
  "object",
  "boolean"
], qy = {
  unevaluatedItems: {
    $dynamicRef: "#meta"
  },
  unevaluatedProperties: {
    $dynamicRef: "#meta"
  }
}, Ky = {
  $schema: My,
  $id: Ly,
  $vocabulary: Vy,
  $dynamicAnchor: Fy,
  title: zy,
  type: Uy,
  properties: qy
}, Gy = "https://json-schema.org/draft/2020-12/schema", Hy = "https://json-schema.org/draft/2020-12/meta/content", By = {
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, Xy = "meta", Jy = "Content vocabulary meta-schema", Wy = [
  "object",
  "boolean"
], Yy = {
  contentEncoding: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentSchema: {
    $dynamicRef: "#meta"
  }
}, Qy = {
  $schema: Gy,
  $id: Hy,
  $vocabulary: By,
  $dynamicAnchor: Xy,
  title: Jy,
  type: Wy,
  properties: Yy
}, Zy = "https://json-schema.org/draft/2020-12/schema", xy = "https://json-schema.org/draft/2020-12/meta/core", e0 = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0
}, t0 = "meta", r0 = "Core vocabulary meta-schema", n0 = [
  "object",
  "boolean"
], s0 = {
  $id: {
    $ref: "#/$defs/uriReferenceString",
    $comment: "Non-empty fragments not allowed.",
    pattern: "^[^#]*#?$"
  },
  $schema: {
    $ref: "#/$defs/uriString"
  },
  $ref: {
    $ref: "#/$defs/uriReferenceString"
  },
  $anchor: {
    $ref: "#/$defs/anchorString"
  },
  $dynamicRef: {
    $ref: "#/$defs/uriReferenceString"
  },
  $dynamicAnchor: {
    $ref: "#/$defs/anchorString"
  },
  $vocabulary: {
    type: "object",
    propertyNames: {
      $ref: "#/$defs/uriString"
    },
    additionalProperties: {
      type: "boolean"
    }
  },
  $comment: {
    type: "string"
  },
  $defs: {
    type: "object",
    additionalProperties: {
      $dynamicRef: "#meta"
    }
  }
}, a0 = {
  anchorString: {
    type: "string",
    pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
  },
  uriString: {
    type: "string",
    format: "uri"
  },
  uriReferenceString: {
    type: "string",
    format: "uri-reference"
  }
}, o0 = {
  $schema: Zy,
  $id: xy,
  $vocabulary: e0,
  $dynamicAnchor: t0,
  title: r0,
  type: n0,
  properties: s0,
  $defs: a0
}, i0 = "https://json-schema.org/draft/2020-12/schema", c0 = "https://json-schema.org/draft/2020-12/meta/format-annotation", l0 = {
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0
}, u0 = "meta", d0 = "Format vocabulary meta-schema for annotation results", f0 = [
  "object",
  "boolean"
], h0 = {
  format: {
    type: "string"
  }
}, m0 = {
  $schema: i0,
  $id: c0,
  $vocabulary: l0,
  $dynamicAnchor: u0,
  title: d0,
  type: f0,
  properties: h0
}, p0 = "https://json-schema.org/draft/2020-12/schema", $0 = "https://json-schema.org/draft/2020-12/meta/meta-data", y0 = {
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0
}, g0 = "meta", _0 = "Meta-data vocabulary meta-schema", v0 = [
  "object",
  "boolean"
], w0 = {
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  default: !0,
  deprecated: {
    type: "boolean",
    default: !1
  },
  readOnly: {
    type: "boolean",
    default: !1
  },
  writeOnly: {
    type: "boolean",
    default: !1
  },
  examples: {
    type: "array",
    items: !0
  }
}, E0 = {
  $schema: p0,
  $id: $0,
  $vocabulary: y0,
  $dynamicAnchor: g0,
  title: _0,
  type: v0,
  properties: w0
}, b0 = "https://json-schema.org/draft/2020-12/schema", S0 = "https://json-schema.org/draft/2020-12/meta/validation", P0 = {
  "https://json-schema.org/draft/2020-12/vocab/validation": !0
}, N0 = "meta", R0 = "Validation vocabulary meta-schema", O0 = [
  "object",
  "boolean"
], I0 = {
  type: {
    anyOf: [
      {
        $ref: "#/$defs/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/$defs/simpleTypes"
        },
        minItems: 1,
        uniqueItems: !0
      }
    ]
  },
  const: !0,
  enum: {
    type: "array",
    items: !0
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  maxItems: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    default: !1
  },
  maxContains: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minContains: {
    $ref: "#/$defs/nonNegativeInteger",
    default: 1
  },
  maxProperties: {
    $ref: "#/$defs/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/$defs/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/$defs/stringArray"
  },
  dependentRequired: {
    type: "object",
    additionalProperties: {
      $ref: "#/$defs/stringArray"
    }
  }
}, T0 = {
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    $ref: "#/$defs/nonNegativeInteger",
    default: 0
  },
  simpleTypes: {
    enum: [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: !0,
    default: []
  }
}, j0 = {
  $schema: b0,
  $id: S0,
  $vocabulary: P0,
  $dynamicAnchor: N0,
  title: R0,
  type: O0,
  properties: I0,
  $defs: T0
};
Object.defineProperty(wo, "__esModule", { value: !0 });
const A0 = Ny, k0 = Dy, C0 = Ky, D0 = Qy, M0 = o0, L0 = m0, V0 = E0, F0 = j0, z0 = ["/properties"];
function U0(e) {
  return [
    A0,
    k0,
    C0,
    D0,
    M0,
    t(this, L0),
    V0,
    t(this, F0)
  ].forEach((r) => this.addMetaSchema(r, void 0, !1)), this;
  function t(r, n) {
    return e ? r.$dataMetaSchema(n, z0) : n;
  }
}
wo.default = U0;
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv2020 = void 0;
  const r = al, n = ka, s = vo, a = wo, o = "https://json-schema.org/draft/2020-12/schema";
  class u extends r.default {
    constructor(g = {}) {
      super({
        ...g,
        dynamicRef: !0,
        next: !0,
        unevaluated: !0
      });
    }
    _addVocabularies() {
      super._addVocabularies(), n.default.forEach((g) => this.addVocabulary(g)), this.opts.discriminator && this.addKeyword(s.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      const { $data: g, meta: w } = this.opts;
      w && (a.default.call(this, g), this.refs["http://json-schema.org/schema"] = o);
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(o) ? o : void 0);
    }
  }
  t.Ajv2020 = u, e.exports = t = u, e.exports.Ajv2020 = u, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = u;
  var c = Ze;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return c.KeywordCxt;
  } });
  var d = W;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return d._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return d.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return d.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return d.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return d.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return d.CodeGen;
  } });
  var l = hn;
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return l.default;
  } });
  var h = kr;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return h.default;
  } });
})(Ys, Ys.exports);
var q0 = Ys.exports, sa = { exports: {} }, cu = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatNames = e.fastFormats = e.fullFormats = void 0;
  function t(V, q) {
    return { validate: V, compare: q };
  }
  e.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: t(a, o),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: t(c(!0), d),
    "date-time": t(S(!0), g),
    "iso-time": t(c(), l),
    "iso-date-time": t(S(), w),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: m,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex: me,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte: N,
    // signed 32 bit integer
    int32: { type: "number", validate: U },
    // signed 64 bit integer
    int64: { type: "number", validate: B },
    // C-type float
    float: { type: "number", validate: le },
    // C-type double
    double: { type: "number", validate: le },
    // hint to the UI to hide input strings
    password: !0,
    // unchecked string payload
    binary: !0
  }, e.fastFormats = {
    ...e.fullFormats,
    date: t(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, o),
    time: t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, d),
    "date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, g),
    "iso-time": t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, l),
    "iso-date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, w),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  }, e.formatNames = Object.keys(e.fullFormats);
  function r(V) {
    return V % 4 === 0 && (V % 100 !== 0 || V % 400 === 0);
  }
  const n = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, s = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function a(V) {
    const q = n.exec(V);
    if (!q)
      return !1;
    const ne = +q[1], K = +q[2], oe = +q[3];
    return K >= 1 && K <= 12 && oe >= 1 && oe <= (K === 2 && r(ne) ? 29 : s[K]);
  }
  function o(V, q) {
    if (V && q)
      return V > q ? 1 : V < q ? -1 : 0;
  }
  const u = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function c(V) {
    return function(ne) {
      const K = u.exec(ne);
      if (!K)
        return !1;
      const oe = +K[1], Ee = +K[2], A = +K[3], j = K[4], M = K[5] === "-" ? -1 : 1, P = +(K[6] || 0), p = +(K[7] || 0);
      if (P > 23 || p > 59 || V && !j)
        return !1;
      if (oe <= 23 && Ee <= 59 && A < 60)
        return !0;
      const b = Ee - p * M, $ = oe - P * M - (b < 0 ? 1 : 0);
      return ($ === 23 || $ === -1) && (b === 59 || b === -1) && A < 61;
    };
  }
  function d(V, q) {
    if (!(V && q))
      return;
    const ne = (/* @__PURE__ */ new Date("2020-01-01T" + V)).valueOf(), K = (/* @__PURE__ */ new Date("2020-01-01T" + q)).valueOf();
    if (ne && K)
      return ne - K;
  }
  function l(V, q) {
    if (!(V && q))
      return;
    const ne = u.exec(V), K = u.exec(q);
    if (ne && K)
      return V = ne[1] + ne[2] + ne[3], q = K[1] + K[2] + K[3], V > q ? 1 : V < q ? -1 : 0;
  }
  const h = /t|\s/i;
  function S(V) {
    const q = c(V);
    return function(K) {
      const oe = K.split(h);
      return oe.length === 2 && a(oe[0]) && q(oe[1]);
    };
  }
  function g(V, q) {
    if (!(V && q))
      return;
    const ne = new Date(V).valueOf(), K = new Date(q).valueOf();
    if (ne && K)
      return ne - K;
  }
  function w(V, q) {
    if (!(V && q))
      return;
    const [ne, K] = V.split(h), [oe, Ee] = q.split(h), A = o(ne, oe);
    if (A !== void 0)
      return A || d(K, Ee);
  }
  const _ = /\/|:/, y = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function m(V) {
    return _.test(V) && y.test(V);
  }
  const v = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function N(V) {
    return v.lastIndex = 0, v.test(V);
  }
  const R = -2147483648, O = 2 ** 31 - 1;
  function U(V) {
    return Number.isInteger(V) && V <= O && V >= R;
  }
  function B(V) {
    return Number.isInteger(V);
  }
  function le() {
    return !0;
  }
  const de = /[^\\]\\Z/;
  function me(V) {
    if (de.test(V))
      return !1;
    try {
      return new RegExp(V), !0;
    } catch {
      return !1;
    }
  }
})(cu);
var lu = {}, aa = { exports: {} }, uu = {}, xe = {}, jr = {}, pn = {}, Z = {}, dn = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
  class t {
  }
  e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends t {
    constructor(v) {
      if (super(), !e.IDENTIFIER.test(v))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = v;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  e.Name = r;
  class n extends t {
    constructor(v) {
      super(), this._items = typeof v == "string" ? [v] : v;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const v = this._items[0];
      return v === "" || v === '""';
    }
    get str() {
      var v;
      return (v = this._str) !== null && v !== void 0 ? v : this._str = this._items.reduce((N, R) => `${N}${R}`, "");
    }
    get names() {
      var v;
      return (v = this._names) !== null && v !== void 0 ? v : this._names = this._items.reduce((N, R) => (R instanceof r && (N[R.str] = (N[R.str] || 0) + 1), N), {});
    }
  }
  e._Code = n, e.nil = new n("");
  function s(m, ...v) {
    const N = [m[0]];
    let R = 0;
    for (; R < v.length; )
      u(N, v[R]), N.push(m[++R]);
    return new n(N);
  }
  e._ = s;
  const a = new n("+");
  function o(m, ...v) {
    const N = [g(m[0])];
    let R = 0;
    for (; R < v.length; )
      N.push(a), u(N, v[R]), N.push(a, g(m[++R]));
    return c(N), new n(N);
  }
  e.str = o;
  function u(m, v) {
    v instanceof n ? m.push(...v._items) : v instanceof r ? m.push(v) : m.push(h(v));
  }
  e.addCodeArg = u;
  function c(m) {
    let v = 1;
    for (; v < m.length - 1; ) {
      if (m[v] === a) {
        const N = d(m[v - 1], m[v + 1]);
        if (N !== void 0) {
          m.splice(v - 1, 3, N);
          continue;
        }
        m[v++] = "+";
      }
      v++;
    }
  }
  function d(m, v) {
    if (v === '""')
      return m;
    if (m === '""')
      return v;
    if (typeof m == "string")
      return v instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof v != "string" ? `${m.slice(0, -1)}${v}"` : v[0] === '"' ? m.slice(0, -1) + v.slice(1) : void 0;
    if (typeof v == "string" && v[0] === '"' && !(m instanceof r))
      return `"${m}${v.slice(1)}`;
  }
  function l(m, v) {
    return v.emptyStr() ? m : m.emptyStr() ? v : o`${m}${v}`;
  }
  e.strConcat = l;
  function h(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : g(Array.isArray(m) ? m.join(",") : m);
  }
  function S(m) {
    return new n(g(m));
  }
  e.stringify = S;
  function g(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  e.safeStringify = g;
  function w(m) {
    return typeof m == "string" && e.IDENTIFIER.test(m) ? new n(`.${m}`) : s`[${m}]`;
  }
  e.getProperty = w;
  function _(m) {
    if (typeof m == "string" && e.IDENTIFIER.test(m))
      return new n(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  e.getEsmExportName = _;
  function y(m) {
    return new n(m.toString());
  }
  e.regexpCode = y;
})(dn);
var oa = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = dn;
  class r extends Error {
    constructor(d) {
      super(`CodeGen: "code" for ${d} not defined`), this.value = d.value;
    }
  }
  var n;
  (function(c) {
    c[c.Started = 0] = "Started", c[c.Completed = 1] = "Completed";
  })(n || (e.UsedValueState = n = {})), e.varKinds = {
    const: new t.Name("const"),
    let: new t.Name("let"),
    var: new t.Name("var")
  };
  class s {
    constructor({ prefixes: d, parent: l } = {}) {
      this._names = {}, this._prefixes = d, this._parent = l;
    }
    toName(d) {
      return d instanceof t.Name ? d : this.name(d);
    }
    name(d) {
      return new t.Name(this._newName(d));
    }
    _newName(d) {
      const l = this._names[d] || this._nameGroup(d);
      return `${d}${l.index++}`;
    }
    _nameGroup(d) {
      var l, h;
      if (!((h = (l = this._parent) === null || l === void 0 ? void 0 : l._prefixes) === null || h === void 0) && h.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  e.Scope = s;
  class a extends t.Name {
    constructor(d, l) {
      super(l), this.prefix = d;
    }
    setValue(d, { property: l, itemIndex: h }) {
      this.value = d, this.scopePath = (0, t._)`.${new t.Name(l)}[${h}]`;
    }
  }
  e.ValueScopeName = a;
  const o = (0, t._)`\n`;
  class u extends s {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? o : t.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new a(d, this._newName(d));
    }
    value(d, l) {
      var h;
      if (l.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const S = this.toName(d), { prefix: g } = S, w = (h = l.key) !== null && h !== void 0 ? h : l.ref;
      let _ = this._values[g];
      if (_) {
        const v = _.get(w);
        if (v)
          return v;
      } else
        _ = this._values[g] = /* @__PURE__ */ new Map();
      _.set(w, S);
      const y = this._scope[g] || (this._scope[g] = []), m = y.length;
      return y[m] = l.ref, S.setValue(l, { property: g, itemIndex: m }), S;
    }
    getValue(d, l) {
      const h = this._values[d];
      if (h)
        return h.get(l);
    }
    scopeRefs(d, l = this._values) {
      return this._reduceValues(l, (h) => {
        if (h.scopePath === void 0)
          throw new Error(`CodeGen: name "${h}" has no value`);
        return (0, t._)`${d}${h.scopePath}`;
      });
    }
    scopeCode(d = this._values, l, h) {
      return this._reduceValues(d, (S) => {
        if (S.value === void 0)
          throw new Error(`CodeGen: name "${S}" has no value`);
        return S.value.code;
      }, l, h);
    }
    _reduceValues(d, l, h = {}, S) {
      let g = t.nil;
      for (const w in d) {
        const _ = d[w];
        if (!_)
          continue;
        const y = h[w] = h[w] || /* @__PURE__ */ new Map();
        _.forEach((m) => {
          if (y.has(m))
            return;
          y.set(m, n.Started);
          let v = l(m);
          if (v) {
            const N = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
            g = (0, t._)`${g}${N} ${m} = ${v};${this.opts._n}`;
          } else if (v = S == null ? void 0 : S(m))
            g = (0, t._)`${g}${v}${this.opts._n}`;
          else
            throw new r(m);
          y.set(m, n.Completed);
        });
      }
      return g;
    }
  }
  e.ValueScope = u;
})(oa);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = dn, r = oa;
  var n = dn;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return n._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return n.str;
  } }), Object.defineProperty(e, "strConcat", { enumerable: !0, get: function() {
    return n.strConcat;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return n.nil;
  } }), Object.defineProperty(e, "getProperty", { enumerable: !0, get: function() {
    return n.getProperty;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return n.stringify;
  } }), Object.defineProperty(e, "regexpCode", { enumerable: !0, get: function() {
    return n.regexpCode;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return n.Name;
  } });
  var s = oa;
  Object.defineProperty(e, "Scope", { enumerable: !0, get: function() {
    return s.Scope;
  } }), Object.defineProperty(e, "ValueScope", { enumerable: !0, get: function() {
    return s.ValueScope;
  } }), Object.defineProperty(e, "ValueScopeName", { enumerable: !0, get: function() {
    return s.ValueScopeName;
  } }), Object.defineProperty(e, "varKinds", { enumerable: !0, get: function() {
    return s.varKinds;
  } }), e.operators = {
    GT: new t._Code(">"),
    GTE: new t._Code(">="),
    LT: new t._Code("<"),
    LTE: new t._Code("<="),
    EQ: new t._Code("==="),
    NEQ: new t._Code("!=="),
    NOT: new t._Code("!"),
    OR: new t._Code("||"),
    AND: new t._Code("&&"),
    ADD: new t._Code("+")
  };
  class a {
    optimizeNodes() {
      return this;
    }
    optimizeNames(i, f) {
      return this;
    }
  }
  class o extends a {
    constructor(i, f, E) {
      super(), this.varKind = i, this.name = f, this.rhs = E;
    }
    render({ es5: i, _n: f }) {
      const E = i ? r.varKinds.var : this.varKind, T = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${E} ${this.name}${T};` + f;
    }
    optimizeNames(i, f) {
      if (i[this.name.str])
        return this.rhs && (this.rhs = K(this.rhs, i, f)), this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class u extends a {
    constructor(i, f, E) {
      super(), this.lhs = i, this.rhs = f, this.sideEffects = E;
    }
    render({ _n: i }) {
      return `${this.lhs} = ${this.rhs};` + i;
    }
    optimizeNames(i, f) {
      if (!(this.lhs instanceof t.Name && !i[this.lhs.str] && !this.sideEffects))
        return this.rhs = K(this.rhs, i, f), this;
    }
    get names() {
      const i = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return ne(i, this.rhs);
    }
  }
  class c extends u {
    constructor(i, f, E, T) {
      super(i, E, T), this.op = f;
    }
    render({ _n: i }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + i;
    }
  }
  class d extends a {
    constructor(i) {
      super(), this.label = i, this.names = {};
    }
    render({ _n: i }) {
      return `${this.label}:` + i;
    }
  }
  class l extends a {
    constructor(i) {
      super(), this.label = i, this.names = {};
    }
    render({ _n: i }) {
      return `break${this.label ? ` ${this.label}` : ""};` + i;
    }
  }
  class h extends a {
    constructor(i) {
      super(), this.error = i;
    }
    render({ _n: i }) {
      return `throw ${this.error};` + i;
    }
    get names() {
      return this.error.names;
    }
  }
  class S extends a {
    constructor(i) {
      super(), this.code = i;
    }
    render({ _n: i }) {
      return `${this.code};` + i;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(i, f) {
      return this.code = K(this.code, i, f), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class g extends a {
    constructor(i = []) {
      super(), this.nodes = i;
    }
    render(i) {
      return this.nodes.reduce((f, E) => f + E.render(i), "");
    }
    optimizeNodes() {
      const { nodes: i } = this;
      let f = i.length;
      for (; f--; ) {
        const E = i[f].optimizeNodes();
        Array.isArray(E) ? i.splice(f, 1, ...E) : E ? i[f] = E : i.splice(f, 1);
      }
      return i.length > 0 ? this : void 0;
    }
    optimizeNames(i, f) {
      const { nodes: E } = this;
      let T = E.length;
      for (; T--; ) {
        const I = E[T];
        I.optimizeNames(i, f) || (oe(i, I.names), E.splice(T, 1));
      }
      return E.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((i, f) => q(i, f.names), {});
    }
  }
  class w extends g {
    render(i) {
      return "{" + i._n + super.render(i) + "}" + i._n;
    }
  }
  class _ extends g {
  }
  class y extends w {
  }
  y.kind = "else";
  class m extends w {
    constructor(i, f) {
      super(f), this.condition = i;
    }
    render(i) {
      let f = `if(${this.condition})` + super.render(i);
      return this.else && (f += "else " + this.else.render(i)), f;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const i = this.condition;
      if (i === !0)
        return this.nodes;
      let f = this.else;
      if (f) {
        const E = f.optimizeNodes();
        f = this.else = Array.isArray(E) ? new y(E) : E;
      }
      if (f)
        return i === !1 ? f instanceof m ? f : f.nodes : this.nodes.length ? this : new m(Ee(i), f instanceof m ? [f] : f.nodes);
      if (!(i === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(i, f) {
      var E;
      if (this.else = (E = this.else) === null || E === void 0 ? void 0 : E.optimizeNames(i, f), !!(super.optimizeNames(i, f) || this.else))
        return this.condition = K(this.condition, i, f), this;
    }
    get names() {
      const i = super.names;
      return ne(i, this.condition), this.else && q(i, this.else.names), i;
    }
  }
  m.kind = "if";
  class v extends w {
  }
  v.kind = "for";
  class N extends v {
    constructor(i) {
      super(), this.iteration = i;
    }
    render(i) {
      return `for(${this.iteration})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iteration = K(this.iteration, i, f), this;
    }
    get names() {
      return q(super.names, this.iteration.names);
    }
  }
  class R extends v {
    constructor(i, f, E, T) {
      super(), this.varKind = i, this.name = f, this.from = E, this.to = T;
    }
    render(i) {
      const f = i.es5 ? r.varKinds.var : this.varKind, { name: E, from: T, to: I } = this;
      return `for(${f} ${E}=${T}; ${E}<${I}; ${E}++)` + super.render(i);
    }
    get names() {
      const i = ne(super.names, this.from);
      return ne(i, this.to);
    }
  }
  class O extends v {
    constructor(i, f, E, T) {
      super(), this.loop = i, this.varKind = f, this.name = E, this.iterable = T;
    }
    render(i) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iterable = K(this.iterable, i, f), this;
    }
    get names() {
      return q(super.names, this.iterable.names);
    }
  }
  class U extends w {
    constructor(i, f, E) {
      super(), this.name = i, this.args = f, this.async = E;
    }
    render(i) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(i);
    }
  }
  U.kind = "func";
  class B extends g {
    render(i) {
      return "return " + super.render(i);
    }
  }
  B.kind = "return";
  class le extends w {
    render(i) {
      let f = "try" + super.render(i);
      return this.catch && (f += this.catch.render(i)), this.finally && (f += this.finally.render(i)), f;
    }
    optimizeNodes() {
      var i, f;
      return super.optimizeNodes(), (i = this.catch) === null || i === void 0 || i.optimizeNodes(), (f = this.finally) === null || f === void 0 || f.optimizeNodes(), this;
    }
    optimizeNames(i, f) {
      var E, T;
      return super.optimizeNames(i, f), (E = this.catch) === null || E === void 0 || E.optimizeNames(i, f), (T = this.finally) === null || T === void 0 || T.optimizeNames(i, f), this;
    }
    get names() {
      const i = super.names;
      return this.catch && q(i, this.catch.names), this.finally && q(i, this.finally.names), i;
    }
  }
  class de extends w {
    constructor(i) {
      super(), this.error = i;
    }
    render(i) {
      return `catch(${this.error})` + super.render(i);
    }
  }
  de.kind = "catch";
  class me extends w {
    render(i) {
      return "finally" + super.render(i);
    }
  }
  me.kind = "finally";
  class V {
    constructor(i, f = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...f, _n: f.lines ? `
` : "" }, this._extScope = i, this._scope = new r.Scope({ parent: i }), this._nodes = [new _()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(i) {
      return this._scope.name(i);
    }
    // reserves unique name in the external scope
    scopeName(i) {
      return this._extScope.name(i);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(i, f) {
      const E = this._extScope.value(i, f);
      return (this._values[E.prefix] || (this._values[E.prefix] = /* @__PURE__ */ new Set())).add(E), E;
    }
    getScopeValue(i, f) {
      return this._extScope.getValue(i, f);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(i) {
      return this._extScope.scopeRefs(i, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(i, f, E, T) {
      const I = this._scope.toName(f);
      return E !== void 0 && T && (this._constants[I.str] = E), this._leafNode(new o(i, I, E)), I;
    }
    // `const` declaration (`var` in es5 mode)
    const(i, f, E) {
      return this._def(r.varKinds.const, i, f, E);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(i, f, E) {
      return this._def(r.varKinds.let, i, f, E);
    }
    // `var` declaration with optional assignment
    var(i, f, E) {
      return this._def(r.varKinds.var, i, f, E);
    }
    // assignment code
    assign(i, f, E) {
      return this._leafNode(new u(i, f, E));
    }
    // `+=` code
    add(i, f) {
      return this._leafNode(new c(i, e.operators.ADD, f));
    }
    // appends passed SafeExpr to code or executes Block
    code(i) {
      return typeof i == "function" ? i() : i !== t.nil && this._leafNode(new S(i)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...i) {
      const f = ["{"];
      for (const [E, T] of i)
        f.length > 1 && f.push(","), f.push(E), (E !== T || this.opts.es5) && (f.push(":"), (0, t.addCodeArg)(f, T));
      return f.push("}"), new t._Code(f);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(i, f, E) {
      if (this._blockNode(new m(i)), f && E)
        this.code(f).else().code(E).endIf();
      else if (f)
        this.code(f).endIf();
      else if (E)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(i) {
      return this._elseNode(new m(i));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new y());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, y);
    }
    _for(i, f) {
      return this._blockNode(i), f && this.code(f).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(i, f) {
      return this._for(new N(i), f);
    }
    // `for` statement for a range of values
    forRange(i, f, E, T, I = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const D = this._scope.toName(i);
      return this._for(new R(I, D, f, E), () => T(D));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(i, f, E, T = r.varKinds.const) {
      const I = this._scope.toName(i);
      if (this.opts.es5) {
        const D = f instanceof t.Name ? f : this.var("_arr", f);
        return this.forRange("_i", 0, (0, t._)`${D}.length`, (L) => {
          this.var(I, (0, t._)`${D}[${L}]`), E(I);
        });
      }
      return this._for(new O("of", T, I, f), () => E(I));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(i, f, E, T = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(i, (0, t._)`Object.keys(${f})`, E);
      const I = this._scope.toName(i);
      return this._for(new O("in", T, I, f), () => E(I));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(v);
    }
    // `label` statement
    label(i) {
      return this._leafNode(new d(i));
    }
    // `break` statement
    break(i) {
      return this._leafNode(new l(i));
    }
    // `return` statement
    return(i) {
      const f = new B();
      if (this._blockNode(f), this.code(i), f.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(B);
    }
    // `try` statement
    try(i, f, E) {
      if (!f && !E)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const T = new le();
      if (this._blockNode(T), this.code(i), f) {
        const I = this.name("e");
        this._currNode = T.catch = new de(I), f(I);
      }
      return E && (this._currNode = T.finally = new me(), this.code(E)), this._endBlockNode(de, me);
    }
    // `throw` statement
    throw(i) {
      return this._leafNode(new h(i));
    }
    // start self-balancing block
    block(i, f) {
      return this._blockStarts.push(this._nodes.length), i && this.code(i).endBlock(f), this;
    }
    // end the current self-balancing block
    endBlock(i) {
      const f = this._blockStarts.pop();
      if (f === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const E = this._nodes.length - f;
      if (E < 0 || i !== void 0 && E !== i)
        throw new Error(`CodeGen: wrong number of nodes: ${E} vs ${i} expected`);
      return this._nodes.length = f, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(i, f = t.nil, E, T) {
      return this._blockNode(new U(i, f, E)), T && this.code(T).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(U);
    }
    optimize(i = 1) {
      for (; i-- > 0; )
        this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(i) {
      return this._currNode.nodes.push(i), this;
    }
    _blockNode(i) {
      this._currNode.nodes.push(i), this._nodes.push(i);
    }
    _endBlockNode(i, f) {
      const E = this._currNode;
      if (E instanceof i || f && E instanceof f)
        return this._nodes.pop(), this;
      throw new Error(`CodeGen: not in block "${f ? `${i.kind}/${f.kind}` : i.kind}"`);
    }
    _elseNode(i) {
      const f = this._currNode;
      if (!(f instanceof m))
        throw new Error('CodeGen: "else" without "if"');
      return this._currNode = f.else = i, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const i = this._nodes;
      return i[i.length - 1];
    }
    set _currNode(i) {
      const f = this._nodes;
      f[f.length - 1] = i;
    }
  }
  e.CodeGen = V;
  function q($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) + (i[f] || 0);
    return $;
  }
  function ne($, i) {
    return i instanceof t._CodeOrName ? q($, i.names) : $;
  }
  function K($, i, f) {
    if ($ instanceof t.Name)
      return E($);
    if (!T($))
      return $;
    return new t._Code($._items.reduce((I, D) => (D instanceof t.Name && (D = E(D)), D instanceof t._Code ? I.push(...D._items) : I.push(D), I), []));
    function E(I) {
      const D = f[I.str];
      return D === void 0 || i[I.str] !== 1 ? I : (delete i[I.str], D);
    }
    function T(I) {
      return I instanceof t._Code && I._items.some((D) => D instanceof t.Name && i[D.str] === 1 && f[D.str] !== void 0);
    }
  }
  function oe($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) - (i[f] || 0);
  }
  function Ee($) {
    return typeof $ == "boolean" || typeof $ == "number" || $ === null ? !$ : (0, t._)`!${b($)}`;
  }
  e.not = Ee;
  const A = p(e.operators.AND);
  function j(...$) {
    return $.reduce(A);
  }
  e.and = j;
  const M = p(e.operators.OR);
  function P(...$) {
    return $.reduce(M);
  }
  e.or = P;
  function p($) {
    return (i, f) => i === t.nil ? f : f === t.nil ? i : (0, t._)`${b(i)} ${$} ${b(f)}`;
  }
  function b($) {
    return $ instanceof t.Name ? $ : (0, t._)`(${$})`;
  }
})(Z);
var C = {};
Object.defineProperty(C, "__esModule", { value: !0 });
C.checkStrictMode = C.getErrorPath = C.Type = C.useFunc = C.setEvaluated = C.evaluatedPropsToName = C.mergeEvaluated = C.eachItem = C.unescapeJsonPointer = C.escapeJsonPointer = C.escapeFragment = C.unescapeFragment = C.schemaRefOrVal = C.schemaHasRulesButRef = C.schemaHasRules = C.checkUnknownRules = C.alwaysValidSchema = C.toHash = void 0;
const ae = Z, K0 = dn;
function G0(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
C.toHash = G0;
function H0(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (du(e, t), !fu(t, e.self.RULES.all));
}
C.alwaysValidSchema = H0;
function du(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || pu(e, `unknown keyword: "${a}"`);
}
C.checkUnknownRules = du;
function fu(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
C.schemaHasRules = fu;
function B0(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
C.schemaHasRulesButRef = B0;
function X0({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, ae._)`${r}`;
  }
  return (0, ae._)`${e}${t}${(0, ae.getProperty)(n)}`;
}
C.schemaRefOrVal = X0;
function J0(e) {
  return hu(decodeURIComponent(e));
}
C.unescapeFragment = J0;
function W0(e) {
  return encodeURIComponent(Eo(e));
}
C.escapeFragment = W0;
function Eo(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
C.escapeJsonPointer = Eo;
function hu(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
C.unescapeJsonPointer = hu;
function Y0(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
C.eachItem = Y0;
function rc({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, u) => {
    const c = o === void 0 ? a : o instanceof ae.Name ? (a instanceof ae.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof ae.Name ? (t(s, o, a), a) : r(a, o);
    return u === ae.Name && !(c instanceof ae.Name) ? n(s, c) : c;
  };
}
C.mergeEvaluated = {
  props: rc({
    mergeNames: (e, t, r) => e.if((0, ae._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, ae._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, ae._)`${r} || {}`).code((0, ae._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, ae._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, ae._)`${r} || {}`), bo(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: mu
  }),
  items: rc({
    mergeNames: (e, t, r) => e.if((0, ae._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, ae._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, ae._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, ae._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function mu(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, ae._)`{}`);
  return t !== void 0 && bo(e, r, t), r;
}
C.evaluatedPropsToName = mu;
function bo(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, ae._)`${t}${(0, ae.getProperty)(n)}`, !0));
}
C.setEvaluated = bo;
const nc = {};
function Q0(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: nc[t.code] || (nc[t.code] = new K0._Code(t.code))
  });
}
C.useFunc = Q0;
var ia;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(ia || (C.Type = ia = {}));
function Z0(e, t, r) {
  if (e instanceof ae.Name) {
    const n = t === ia.Num;
    return r ? n ? (0, ae._)`"[" + ${e} + "]"` : (0, ae._)`"['" + ${e} + "']"` : n ? (0, ae._)`"/" + ${e}` : (0, ae._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, ae.getProperty)(e).toString() : "/" + Eo(e);
}
C.getErrorPath = Z0;
function pu(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
C.checkStrictMode = pu;
var ct = {};
Object.defineProperty(ct, "__esModule", { value: !0 });
const Ne = Z, x0 = {
  // validation function arguments
  data: new Ne.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new Ne.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new Ne.Name("instancePath"),
  parentData: new Ne.Name("parentData"),
  parentDataProperty: new Ne.Name("parentDataProperty"),
  rootData: new Ne.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new Ne.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new Ne.Name("vErrors"),
  // null or array of validation errors
  errors: new Ne.Name("errors"),
  // counter of validation errors
  this: new Ne.Name("this"),
  // "globals"
  self: new Ne.Name("self"),
  scope: new Ne.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new Ne.Name("json"),
  jsonPos: new Ne.Name("jsonPos"),
  jsonLen: new Ne.Name("jsonLen"),
  jsonPart: new Ne.Name("jsonPart")
};
ct.default = x0;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = Z, r = C, n = ct;
  e.keywordError = {
    message: ({ keyword: y }) => (0, t.str)`must pass "${y}" keyword validation`
  }, e.keyword$DataError = {
    message: ({ keyword: y, schemaType: m }) => m ? (0, t.str)`"${y}" keyword must be ${m} ($data)` : (0, t.str)`"${y}" keyword is invalid ($data)`
  };
  function s(y, m = e.keywordError, v, N) {
    const { it: R } = y, { gen: O, compositeRule: U, allErrors: B } = R, le = h(y, m, v);
    N ?? (U || B) ? c(O, le) : d(R, (0, t._)`[${le}]`);
  }
  e.reportError = s;
  function a(y, m = e.keywordError, v) {
    const { it: N } = y, { gen: R, compositeRule: O, allErrors: U } = N, B = h(y, m, v);
    c(R, B), O || U || d(N, n.default.vErrors);
  }
  e.reportExtraError = a;
  function o(y, m) {
    y.assign(n.default.errors, m), y.if((0, t._)`${n.default.vErrors} !== null`, () => y.if(m, () => y.assign((0, t._)`${n.default.vErrors}.length`, m), () => y.assign(n.default.vErrors, null)));
  }
  e.resetErrorsCount = o;
  function u({ gen: y, keyword: m, schemaValue: v, data: N, errsCount: R, it: O }) {
    if (R === void 0)
      throw new Error("ajv implementation error");
    const U = y.name("err");
    y.forRange("i", R, n.default.errors, (B) => {
      y.const(U, (0, t._)`${n.default.vErrors}[${B}]`), y.if((0, t._)`${U}.instancePath === undefined`, () => y.assign((0, t._)`${U}.instancePath`, (0, t.strConcat)(n.default.instancePath, O.errorPath))), y.assign((0, t._)`${U}.schemaPath`, (0, t.str)`${O.errSchemaPath}/${m}`), O.opts.verbose && (y.assign((0, t._)`${U}.schema`, v), y.assign((0, t._)`${U}.data`, N));
    });
  }
  e.extendErrors = u;
  function c(y, m) {
    const v = y.const("err", m);
    y.if((0, t._)`${n.default.vErrors} === null`, () => y.assign(n.default.vErrors, (0, t._)`[${v}]`), (0, t._)`${n.default.vErrors}.push(${v})`), y.code((0, t._)`${n.default.errors}++`);
  }
  function d(y, m) {
    const { gen: v, validateName: N, schemaEnv: R } = y;
    R.$async ? v.throw((0, t._)`new ${y.ValidationError}(${m})`) : (v.assign((0, t._)`${N}.errors`, m), v.return(!1));
  }
  const l = {
    keyword: new t.Name("keyword"),
    schemaPath: new t.Name("schemaPath"),
    // also used in JTD errors
    params: new t.Name("params"),
    propertyName: new t.Name("propertyName"),
    message: new t.Name("message"),
    schema: new t.Name("schema"),
    parentSchema: new t.Name("parentSchema")
  };
  function h(y, m, v) {
    const { createErrors: N } = y.it;
    return N === !1 ? (0, t._)`{}` : S(y, m, v);
  }
  function S(y, m, v = {}) {
    const { gen: N, it: R } = y, O = [
      g(R, v),
      w(y, v)
    ];
    return _(y, m, O), N.object(...O);
  }
  function g({ errorPath: y }, { instancePath: m }) {
    const v = m ? (0, t.str)`${y}${(0, r.getErrorPath)(m, r.Type.Str)}` : y;
    return [n.default.instancePath, (0, t.strConcat)(n.default.instancePath, v)];
  }
  function w({ keyword: y, it: { errSchemaPath: m } }, { schemaPath: v, parentSchema: N }) {
    let R = N ? m : (0, t.str)`${m}/${y}`;
    return v && (R = (0, t.str)`${R}${(0, r.getErrorPath)(v, r.Type.Str)}`), [l.schemaPath, R];
  }
  function _(y, { params: m, message: v }, N) {
    const { keyword: R, data: O, schemaValue: U, it: B } = y, { opts: le, propertyName: de, topSchemaRef: me, schemaPath: V } = B;
    N.push([l.keyword, R], [l.params, typeof m == "function" ? m(y) : m || (0, t._)`{}`]), le.messages && N.push([l.message, typeof v == "function" ? v(y) : v]), le.verbose && N.push([l.schema, U], [l.parentSchema, (0, t._)`${me}${V}`], [n.default.data, O]), de && N.push([l.propertyName, de]);
  }
})(pn);
Object.defineProperty(jr, "__esModule", { value: !0 });
jr.boolOrEmptySchema = jr.topBoolOrEmptySchema = void 0;
const eg = pn, tg = Z, rg = ct, ng = {
  message: "boolean schema is false"
};
function sg(e) {
  const { gen: t, schema: r, validateName: n } = e;
  r === !1 ? $u(e, !1) : typeof r == "object" && r.$async === !0 ? t.return(rg.default.data) : (t.assign((0, tg._)`${n}.errors`, null), t.return(!0));
}
jr.topBoolOrEmptySchema = sg;
function ag(e, t) {
  const { gen: r, schema: n } = e;
  n === !1 ? (r.var(t, !1), $u(e)) : r.var(t, !0);
}
jr.boolOrEmptySchema = ag;
function $u(e, t) {
  const { gen: r, data: n } = e, s = {
    gen: r,
    keyword: "false schema",
    data: n,
    schema: !1,
    schemaCode: !1,
    schemaValue: !1,
    params: {},
    it: e
  };
  (0, eg.reportError)(s, ng, void 0, t);
}
var $e = {}, lr = {};
Object.defineProperty(lr, "__esModule", { value: !0 });
lr.getRules = lr.isJSONType = void 0;
const og = ["string", "number", "integer", "boolean", "null", "object", "array"], ig = new Set(og);
function cg(e) {
  return typeof e == "string" && ig.has(e);
}
lr.isJSONType = cg;
function lg() {
  const e = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...e, integer: !0, boolean: !0, null: !0 },
    rules: [{ rules: [] }, e.number, e.string, e.array, e.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
lr.getRules = lg;
var mt = {};
Object.defineProperty(mt, "__esModule", { value: !0 });
mt.shouldUseRule = mt.shouldUseGroup = mt.schemaHasRulesForType = void 0;
function ug({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && yu(e, n);
}
mt.schemaHasRulesForType = ug;
function yu(e, t) {
  return t.rules.some((r) => gu(e, r));
}
mt.shouldUseGroup = yu;
function gu(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
mt.shouldUseRule = gu;
Object.defineProperty($e, "__esModule", { value: !0 });
$e.reportTypeError = $e.checkDataTypes = $e.checkDataType = $e.coerceAndCheckDataType = $e.getJSONTypes = $e.getSchemaTypes = $e.DataType = void 0;
const dg = lr, fg = mt, hg = pn, Q = Z, _u = C;
var Pr;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(Pr || ($e.DataType = Pr = {}));
function mg(e) {
  const t = vu(e.type);
  if (t.includes("null")) {
    if (e.nullable === !1)
      throw new Error("type: null contradicts nullable: false");
  } else {
    if (!t.length && e.nullable !== void 0)
      throw new Error('"nullable" cannot be used without "type"');
    e.nullable === !0 && t.push("null");
  }
  return t;
}
$e.getSchemaTypes = mg;
function vu(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(dg.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
$e.getJSONTypes = vu;
function pg(e, t) {
  const { gen: r, data: n, opts: s } = e, a = $g(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, fg.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const u = So(t, n, s.strictNumbers, Pr.Wrong);
    r.if(u, () => {
      a.length ? yg(e, t, a) : Po(e);
    });
  }
  return o;
}
$e.coerceAndCheckDataType = pg;
const wu = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function $g(e, t) {
  return t ? e.filter((r) => wu.has(r) || t === "array" && r === "array") : [];
}
function yg(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, Q._)`typeof ${s}`), u = n.let("coerced", (0, Q._)`undefined`);
  a.coerceTypes === "array" && n.if((0, Q._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, Q._)`${s}[0]`).assign(o, (0, Q._)`typeof ${s}`).if(So(t, s, a.strictNumbers), () => n.assign(u, s))), n.if((0, Q._)`${u} !== undefined`);
  for (const d of r)
    (wu.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), Po(e), n.endIf(), n.if((0, Q._)`${u} !== undefined`, () => {
    n.assign(s, u), gg(e, u);
  });
  function c(d) {
    switch (d) {
      case "string":
        n.elseIf((0, Q._)`${o} == "number" || ${o} == "boolean"`).assign(u, (0, Q._)`"" + ${s}`).elseIf((0, Q._)`${s} === null`).assign(u, (0, Q._)`""`);
        return;
      case "number":
        n.elseIf((0, Q._)`${o} == "boolean" || ${s} === null
              || (${o} == "string" && ${s} && ${s} == +${s})`).assign(u, (0, Q._)`+${s}`);
        return;
      case "integer":
        n.elseIf((0, Q._)`${o} === "boolean" || ${s} === null
              || (${o} === "string" && ${s} && ${s} == +${s} && !(${s} % 1))`).assign(u, (0, Q._)`+${s}`);
        return;
      case "boolean":
        n.elseIf((0, Q._)`${s} === "false" || ${s} === 0 || ${s} === null`).assign(u, !1).elseIf((0, Q._)`${s} === "true" || ${s} === 1`).assign(u, !0);
        return;
      case "null":
        n.elseIf((0, Q._)`${s} === "" || ${s} === 0 || ${s} === false`), n.assign(u, null);
        return;
      case "array":
        n.elseIf((0, Q._)`${o} === "string" || ${o} === "number"
              || ${o} === "boolean" || ${s} === null`).assign(u, (0, Q._)`[${s}]`);
    }
  }
}
function gg({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, Q._)`${t} !== undefined`, () => e.assign((0, Q._)`${t}[${r}]`, n));
}
function ca(e, t, r, n = Pr.Correct) {
  const s = n === Pr.Correct ? Q.operators.EQ : Q.operators.NEQ;
  let a;
  switch (e) {
    case "null":
      return (0, Q._)`${t} ${s} null`;
    case "array":
      a = (0, Q._)`Array.isArray(${t})`;
      break;
    case "object":
      a = (0, Q._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
      break;
    case "integer":
      a = o((0, Q._)`!(${t} % 1) && !isNaN(${t})`);
      break;
    case "number":
      a = o();
      break;
    default:
      return (0, Q._)`typeof ${t} ${s} ${e}`;
  }
  return n === Pr.Correct ? a : (0, Q.not)(a);
  function o(u = Q.nil) {
    return (0, Q.and)((0, Q._)`typeof ${t} == "number"`, u, r ? (0, Q._)`isFinite(${t})` : Q.nil);
  }
}
$e.checkDataType = ca;
function So(e, t, r, n) {
  if (e.length === 1)
    return ca(e[0], t, r, n);
  let s;
  const a = (0, _u.toHash)(e);
  if (a.array && a.object) {
    const o = (0, Q._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, Q._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = Q.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, Q.and)(s, ca(o, t, r, n));
  return s;
}
$e.checkDataTypes = So;
const _g = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, Q._)`{type: ${e}}` : (0, Q._)`{type: ${t}}`
};
function Po(e) {
  const t = vg(e);
  (0, hg.reportError)(t, _g);
}
$e.reportTypeError = Po;
function vg(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, _u.schemaRefOrVal)(e, n, "type");
  return {
    gen: t,
    keyword: "type",
    data: r,
    schema: n.type,
    schemaCode: s,
    schemaValue: s,
    parentSchema: n,
    params: {},
    it: e
  };
}
var ps = {};
Object.defineProperty(ps, "__esModule", { value: !0 });
ps.assignDefaults = void 0;
const mr = Z, wg = C;
function Eg(e, t) {
  const { properties: r, items: n } = e.schema;
  if (t === "object" && r)
    for (const s in r)
      sc(e, s, r[s].default);
  else t === "array" && Array.isArray(n) && n.forEach((s, a) => sc(e, a, s.default));
}
ps.assignDefaults = Eg;
function sc(e, t, r) {
  const { gen: n, compositeRule: s, data: a, opts: o } = e;
  if (r === void 0)
    return;
  const u = (0, mr._)`${a}${(0, mr.getProperty)(t)}`;
  if (s) {
    (0, wg.checkStrictMode)(e, `default is ignored for: ${u}`);
    return;
  }
  let c = (0, mr._)`${u} === undefined`;
  o.useDefaults === "empty" && (c = (0, mr._)`${c} || ${u} === null || ${u} === ""`), n.if(c, (0, mr._)`${u} = ${(0, mr.stringify)(r)}`);
}
var it = {}, te = {};
Object.defineProperty(te, "__esModule", { value: !0 });
te.validateUnion = te.validateArray = te.usePattern = te.callValidateCode = te.schemaProperties = te.allSchemaProperties = te.noPropertyInData = te.propertyInData = te.isOwnProperty = te.hasPropFunc = te.reportMissingProp = te.checkMissingProp = te.checkReportMissingProp = void 0;
const ce = Z, No = C, Et = ct, bg = C;
function Sg(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if(Oo(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, ce._)`${t}` }, !0), e.error();
  });
}
te.checkReportMissingProp = Sg;
function Pg({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, ce.or)(...n.map((a) => (0, ce.and)(Oo(e, t, a, r.ownProperties), (0, ce._)`${s} = ${a}`)));
}
te.checkMissingProp = Pg;
function Ng(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
te.reportMissingProp = Ng;
function Eu(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, ce._)`Object.prototype.hasOwnProperty`
  });
}
te.hasPropFunc = Eu;
function Ro(e, t, r) {
  return (0, ce._)`${Eu(e)}.call(${t}, ${r})`;
}
te.isOwnProperty = Ro;
function Rg(e, t, r, n) {
  const s = (0, ce._)`${t}${(0, ce.getProperty)(r)} !== undefined`;
  return n ? (0, ce._)`${s} && ${Ro(e, t, r)}` : s;
}
te.propertyInData = Rg;
function Oo(e, t, r, n) {
  const s = (0, ce._)`${t}${(0, ce.getProperty)(r)} === undefined`;
  return n ? (0, ce.or)(s, (0, ce.not)(Ro(e, t, r))) : s;
}
te.noPropertyInData = Oo;
function bu(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
te.allSchemaProperties = bu;
function Og(e, t) {
  return bu(t).filter((r) => !(0, No.alwaysValidSchema)(e, t[r]));
}
te.schemaProperties = Og;
function Ig({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, u, c, d) {
  const l = d ? (0, ce._)`${e}, ${t}, ${n}${s}` : t, h = [
    [Et.default.instancePath, (0, ce.strConcat)(Et.default.instancePath, a)],
    [Et.default.parentData, o.parentData],
    [Et.default.parentDataProperty, o.parentDataProperty],
    [Et.default.rootData, Et.default.rootData]
  ];
  o.opts.dynamicRef && h.push([Et.default.dynamicAnchors, Et.default.dynamicAnchors]);
  const S = (0, ce._)`${l}, ${r.object(...h)}`;
  return c !== ce.nil ? (0, ce._)`${u}.call(${c}, ${S})` : (0, ce._)`${u}(${S})`;
}
te.callValidateCode = Ig;
const Tg = (0, ce._)`new RegExp`;
function jg({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, ce._)`${s.code === "new RegExp" ? Tg : (0, bg.useFunc)(e, s)}(${r}, ${n})`
  });
}
te.usePattern = jg;
function Ag(e) {
  const { gen: t, data: r, keyword: n, it: s } = e, a = t.name("valid");
  if (s.allErrors) {
    const u = t.let("valid", !0);
    return o(() => t.assign(u, !1)), u;
  }
  return t.var(a, !0), o(() => t.break()), a;
  function o(u) {
    const c = t.const("len", (0, ce._)`${r}.length`);
    t.forRange("i", 0, c, (d) => {
      e.subschema({
        keyword: n,
        dataProp: d,
        dataPropType: No.Type.Num
      }, a), t.if((0, ce.not)(a), u);
    });
  }
}
te.validateArray = Ag;
function kg(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, No.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
    return;
  const o = t.let("valid", !1), u = t.name("_valid");
  t.block(() => r.forEach((c, d) => {
    const l = e.subschema({
      keyword: n,
      schemaProp: d,
      compositeRule: !0
    }, u);
    t.assign(o, (0, ce._)`${o} || ${u}`), e.mergeValidEvaluated(l, u) || t.if((0, ce.not)(o));
  })), e.result(o, () => e.reset(), () => e.error(!0));
}
te.validateUnion = kg;
Object.defineProperty(it, "__esModule", { value: !0 });
it.validateKeywordUsage = it.validSchemaType = it.funcKeywordCode = it.macroKeywordCode = void 0;
const je = Z, er = ct, Cg = te, Dg = pn;
function Mg(e, t) {
  const { gen: r, keyword: n, schema: s, parentSchema: a, it: o } = e, u = t.macro.call(o.self, s, a, o), c = Su(r, n, u);
  o.opts.validateSchema !== !1 && o.self.validateSchema(u, !0);
  const d = r.name("valid");
  e.subschema({
    schema: u,
    schemaPath: je.nil,
    errSchemaPath: `${o.errSchemaPath}/${n}`,
    topSchemaRef: c,
    compositeRule: !0
  }, d), e.pass(d, () => e.error(!0));
}
it.macroKeywordCode = Mg;
function Lg(e, t) {
  var r;
  const { gen: n, keyword: s, schema: a, parentSchema: o, $data: u, it: c } = e;
  Fg(c, t);
  const d = !u && t.compile ? t.compile.call(c.self, a, o, c) : t.validate, l = Su(n, s, d), h = n.let("valid");
  e.block$data(h, S), e.ok((r = t.valid) !== null && r !== void 0 ? r : h);
  function S() {
    if (t.errors === !1)
      _(), t.modifying && ac(e), y(() => e.error());
    else {
      const m = t.async ? g() : w();
      t.modifying && ac(e), y(() => Vg(e, m));
    }
  }
  function g() {
    const m = n.let("ruleErrs", null);
    return n.try(() => _((0, je._)`await `), (v) => n.assign(h, !1).if((0, je._)`${v} instanceof ${c.ValidationError}`, () => n.assign(m, (0, je._)`${v}.errors`), () => n.throw(v))), m;
  }
  function w() {
    const m = (0, je._)`${l}.errors`;
    return n.assign(m, null), _(je.nil), m;
  }
  function _(m = t.async ? (0, je._)`await ` : je.nil) {
    const v = c.opts.passContext ? er.default.this : er.default.self, N = !("compile" in t && !u || t.schema === !1);
    n.assign(h, (0, je._)`${m}${(0, Cg.callValidateCode)(e, l, v, N)}`, t.modifying);
  }
  function y(m) {
    var v;
    n.if((0, je.not)((v = t.valid) !== null && v !== void 0 ? v : h), m);
  }
}
it.funcKeywordCode = Lg;
function ac(e) {
  const { gen: t, data: r, it: n } = e;
  t.if(n.parentData, () => t.assign(r, (0, je._)`${n.parentData}[${n.parentDataProperty}]`));
}
function Vg(e, t) {
  const { gen: r } = e;
  r.if((0, je._)`Array.isArray(${t})`, () => {
    r.assign(er.default.vErrors, (0, je._)`${er.default.vErrors} === null ? ${t} : ${er.default.vErrors}.concat(${t})`).assign(er.default.errors, (0, je._)`${er.default.vErrors}.length`), (0, Dg.extendErrors)(e);
  }, () => e.error());
}
function Fg({ schemaEnv: e }, t) {
  if (t.async && !e.$async)
    throw new Error("async keyword in sync schema");
}
function Su(e, t, r) {
  if (r === void 0)
    throw new Error(`keyword "${t}" failed to compile`);
  return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, je.stringify)(r) });
}
function zg(e, t, r = !1) {
  return !t.length || t.some((n) => n === "array" ? Array.isArray(e) : n === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == n || r && typeof e > "u");
}
it.validSchemaType = zg;
function Ug({ schema: e, opts: t, self: r, errSchemaPath: n }, s, a) {
  if (Array.isArray(s.keyword) ? !s.keyword.includes(a) : s.keyword !== a)
    throw new Error("ajv implementation error");
  const o = s.dependencies;
  if (o != null && o.some((u) => !Object.prototype.hasOwnProperty.call(e, u)))
    throw new Error(`parent schema must have dependencies of ${a}: ${o.join(",")}`);
  if (s.validateSchema && !s.validateSchema(e[a])) {
    const c = `keyword "${a}" value is invalid at path "${n}": ` + r.errorsText(s.validateSchema.errors);
    if (t.validateSchema === "log")
      r.logger.error(c);
    else
      throw new Error(c);
  }
}
it.validateKeywordUsage = Ug;
var kt = {};
Object.defineProperty(kt, "__esModule", { value: !0 });
kt.extendSubschemaMode = kt.extendSubschemaData = kt.getSubschema = void 0;
const at = Z, Pu = C;
function qg(e, { keyword: t, schemaProp: r, schema: n, schemaPath: s, errSchemaPath: a, topSchemaRef: o }) {
  if (t !== void 0 && n !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (t !== void 0) {
    const u = e.schema[t];
    return r === void 0 ? {
      schema: u,
      schemaPath: (0, at._)`${e.schemaPath}${(0, at.getProperty)(t)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}`
    } : {
      schema: u[r],
      schemaPath: (0, at._)`${e.schemaPath}${(0, at.getProperty)(t)}${(0, at.getProperty)(r)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}/${(0, Pu.escapeFragment)(r)}`
    };
  }
  if (n !== void 0) {
    if (s === void 0 || a === void 0 || o === void 0)
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    return {
      schema: n,
      schemaPath: s,
      topSchemaRef: o,
      errSchemaPath: a
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
kt.getSubschema = qg;
function Kg(e, t, { dataProp: r, dataPropType: n, data: s, dataTypes: a, propertyName: o }) {
  if (s !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: u } = t;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: l, opts: h } = t, S = u.let("data", (0, at._)`${t.data}${(0, at.getProperty)(r)}`, !0);
    c(S), e.errorPath = (0, at.str)`${d}${(0, Pu.getErrorPath)(r, n, h.jsPropertySyntax)}`, e.parentDataProperty = (0, at._)`${r}`, e.dataPathArr = [...l, e.parentDataProperty];
  }
  if (s !== void 0) {
    const d = s instanceof at.Name ? s : u.let("data", s, !0);
    c(d), o !== void 0 && (e.propertyName = o);
  }
  a && (e.dataTypes = a);
  function c(d) {
    e.data = d, e.dataLevel = t.dataLevel + 1, e.dataTypes = [], t.definedProperties = /* @__PURE__ */ new Set(), e.parentData = t.data, e.dataNames = [...t.dataNames, d];
  }
}
kt.extendSubschemaData = Kg;
function Gg(e, { jtdDiscriminator: t, jtdMetadata: r, compositeRule: n, createErrors: s, allErrors: a }) {
  n !== void 0 && (e.compositeRule = n), s !== void 0 && (e.createErrors = s), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = r;
}
kt.extendSubschemaMode = Gg;
var we = {}, Nu = { exports: {} }, jt = Nu.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  Hn(t, n, s, e, "", e);
};
jt.keywords = {
  additionalItems: !0,
  items: !0,
  contains: !0,
  additionalProperties: !0,
  propertyNames: !0,
  not: !0,
  if: !0,
  then: !0,
  else: !0
};
jt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
jt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
jt.skipKeywords = {
  default: !0,
  enum: !0,
  const: !0,
  required: !0,
  maximum: !0,
  minimum: !0,
  exclusiveMaximum: !0,
  exclusiveMinimum: !0,
  multipleOf: !0,
  maxLength: !0,
  minLength: !0,
  pattern: !0,
  format: !0,
  maxItems: !0,
  minItems: !0,
  uniqueItems: !0,
  maxProperties: !0,
  minProperties: !0
};
function Hn(e, t, r, n, s, a, o, u, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, u, c, d);
    for (var l in n) {
      var h = n[l];
      if (Array.isArray(h)) {
        if (l in jt.arrayKeywords)
          for (var S = 0; S < h.length; S++)
            Hn(e, t, r, h[S], s + "/" + l + "/" + S, a, s, l, n, S);
      } else if (l in jt.propsKeywords) {
        if (h && typeof h == "object")
          for (var g in h)
            Hn(e, t, r, h[g], s + "/" + l + "/" + Hg(g), a, s, l, n, g);
      } else (l in jt.keywords || e.allKeys && !(l in jt.skipKeywords)) && Hn(e, t, r, h, s + "/" + l, a, s, l, n);
    }
    r(n, s, a, o, u, c, d);
  }
}
function Hg(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var Bg = Nu.exports;
Object.defineProperty(we, "__esModule", { value: !0 });
we.getSchemaRefs = we.resolveUrl = we.normalizeId = we._getFullPath = we.getFullPath = we.inlineRef = void 0;
const Xg = C, Jg = cs, Wg = Bg, Yg = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function Qg(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !la(e) : t ? Ru(e) <= t : !1;
}
we.inlineRef = Qg;
const Zg = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function la(e) {
  for (const t in e) {
    if (Zg.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(la) || typeof r == "object" && la(r))
      return !0;
  }
  return !1;
}
function Ru(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !Yg.has(r) && (typeof e[r] == "object" && (0, Xg.eachItem)(e[r], (n) => t += Ru(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function Ou(e, t = "", r) {
  r !== !1 && (t = Nr(t));
  const n = e.parse(t);
  return Iu(e, n);
}
we.getFullPath = Ou;
function Iu(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
we._getFullPath = Iu;
const xg = /#\/?$/;
function Nr(e) {
  return e ? e.replace(xg, "") : "";
}
we.normalizeId = Nr;
function e_(e, t, r) {
  return r = Nr(r), e.resolve(t, r);
}
we.resolveUrl = e_;
const t_ = /^[a-z_][-a-z0-9._]*$/i;
function r_(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = Nr(e[r] || t), a = { "": s }, o = Ou(n, s, !1), u = {}, c = /* @__PURE__ */ new Set();
  return Wg(e, { allKeys: !0 }, (h, S, g, w) => {
    if (w === void 0)
      return;
    const _ = o + S;
    let y = a[w];
    typeof h[r] == "string" && (y = m.call(this, h[r])), v.call(this, h.$anchor), v.call(this, h.$dynamicAnchor), a[S] = y;
    function m(N) {
      const R = this.opts.uriResolver.resolve;
      if (N = Nr(y ? R(y, N) : N), c.has(N))
        throw l(N);
      c.add(N);
      let O = this.refs[N];
      return typeof O == "string" && (O = this.refs[O]), typeof O == "object" ? d(h, O.schema, N) : N !== Nr(_) && (N[0] === "#" ? (d(h, u[N], N), u[N] = h) : this.refs[N] = _), N;
    }
    function v(N) {
      if (typeof N == "string") {
        if (!t_.test(N))
          throw new Error(`invalid anchor "${N}"`);
        m.call(this, `#${N}`);
      }
    }
  }), u;
  function d(h, S, g) {
    if (S !== void 0 && !Jg(h, S))
      throw l(g);
  }
  function l(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
we.getSchemaRefs = r_;
Object.defineProperty(xe, "__esModule", { value: !0 });
xe.getData = xe.KeywordCxt = xe.validateFunctionCode = void 0;
const Tu = jr, oc = $e, Io = mt, rs = $e, n_ = ps, sn = it, Ds = kt, z = Z, H = ct, s_ = we, pt = C, Xr = pn;
function a_(e) {
  if (ku(e) && (Cu(e), Au(e))) {
    c_(e);
    return;
  }
  ju(e, () => (0, Tu.topBoolOrEmptySchema)(e));
}
xe.validateFunctionCode = a_;
function ju({ gen: e, validateName: t, schema: r, schemaEnv: n, opts: s }, a) {
  s.code.es5 ? e.func(t, (0, z._)`${H.default.data}, ${H.default.valCxt}`, n.$async, () => {
    e.code((0, z._)`"use strict"; ${ic(r, s)}`), i_(e, s), e.code(a);
  }) : e.func(t, (0, z._)`${H.default.data}, ${o_(s)}`, n.$async, () => e.code(ic(r, s)).code(a));
}
function o_(e) {
  return (0, z._)`{${H.default.instancePath}="", ${H.default.parentData}, ${H.default.parentDataProperty}, ${H.default.rootData}=${H.default.data}${e.dynamicRef ? (0, z._)`, ${H.default.dynamicAnchors}={}` : z.nil}}={}`;
}
function i_(e, t) {
  e.if(H.default.valCxt, () => {
    e.var(H.default.instancePath, (0, z._)`${H.default.valCxt}.${H.default.instancePath}`), e.var(H.default.parentData, (0, z._)`${H.default.valCxt}.${H.default.parentData}`), e.var(H.default.parentDataProperty, (0, z._)`${H.default.valCxt}.${H.default.parentDataProperty}`), e.var(H.default.rootData, (0, z._)`${H.default.valCxt}.${H.default.rootData}`), t.dynamicRef && e.var(H.default.dynamicAnchors, (0, z._)`${H.default.valCxt}.${H.default.dynamicAnchors}`);
  }, () => {
    e.var(H.default.instancePath, (0, z._)`""`), e.var(H.default.parentData, (0, z._)`undefined`), e.var(H.default.parentDataProperty, (0, z._)`undefined`), e.var(H.default.rootData, H.default.data), t.dynamicRef && e.var(H.default.dynamicAnchors, (0, z._)`{}`);
  });
}
function c_(e) {
  const { schema: t, opts: r, gen: n } = e;
  ju(e, () => {
    r.$comment && t.$comment && Mu(e), h_(e), n.let(H.default.vErrors, null), n.let(H.default.errors, 0), r.unevaluated && l_(e), Du(e), $_(e);
  });
}
function l_(e) {
  const { gen: t, validateName: r } = e;
  e.evaluated = t.const("evaluated", (0, z._)`${r}.evaluated`), t.if((0, z._)`${e.evaluated}.dynamicProps`, () => t.assign((0, z._)`${e.evaluated}.props`, (0, z._)`undefined`)), t.if((0, z._)`${e.evaluated}.dynamicItems`, () => t.assign((0, z._)`${e.evaluated}.items`, (0, z._)`undefined`));
}
function ic(e, t) {
  const r = typeof e == "object" && e[t.schemaId];
  return r && (t.code.source || t.code.process) ? (0, z._)`/*# sourceURL=${r} */` : z.nil;
}
function u_(e, t) {
  if (ku(e) && (Cu(e), Au(e))) {
    d_(e, t);
    return;
  }
  (0, Tu.boolOrEmptySchema)(e, t);
}
function Au({ schema: e, self: t }) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t.RULES.all[r])
      return !0;
  return !1;
}
function ku(e) {
  return typeof e.schema != "boolean";
}
function d_(e, t) {
  const { schema: r, gen: n, opts: s } = e;
  s.$comment && r.$comment && Mu(e), m_(e), p_(e);
  const a = n.const("_errs", H.default.errors);
  Du(e, a), n.var(t, (0, z._)`${a} === ${H.default.errors}`);
}
function Cu(e) {
  (0, pt.checkUnknownRules)(e), f_(e);
}
function Du(e, t) {
  if (e.opts.jtd)
    return cc(e, [], !1, t);
  const r = (0, oc.getSchemaTypes)(e.schema), n = (0, oc.coerceAndCheckDataType)(e, r);
  cc(e, r, !n, t);
}
function f_(e) {
  const { schema: t, errSchemaPath: r, opts: n, self: s } = e;
  t.$ref && n.ignoreKeywordsWithRef && (0, pt.schemaHasRulesButRef)(t, s.RULES) && s.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function h_(e) {
  const { schema: t, opts: r } = e;
  t.default !== void 0 && r.useDefaults && r.strictSchema && (0, pt.checkStrictMode)(e, "default is ignored in the schema root");
}
function m_(e) {
  const t = e.schema[e.opts.schemaId];
  t && (e.baseId = (0, s_.resolveUrl)(e.opts.uriResolver, e.baseId, t));
}
function p_(e) {
  if (e.schema.$async && !e.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function Mu({ gen: e, schemaEnv: t, schema: r, errSchemaPath: n, opts: s }) {
  const a = r.$comment;
  if (s.$comment === !0)
    e.code((0, z._)`${H.default.self}.logger.log(${a})`);
  else if (typeof s.$comment == "function") {
    const o = (0, z.str)`${n}/$comment`, u = e.scopeValue("root", { ref: t.root });
    e.code((0, z._)`${H.default.self}.opts.$comment(${a}, ${o}, ${u}.schema)`);
  }
}
function $_(e) {
  const { gen: t, schemaEnv: r, validateName: n, ValidationError: s, opts: a } = e;
  r.$async ? t.if((0, z._)`${H.default.errors} === 0`, () => t.return(H.default.data), () => t.throw((0, z._)`new ${s}(${H.default.vErrors})`)) : (t.assign((0, z._)`${n}.errors`, H.default.vErrors), a.unevaluated && y_(e), t.return((0, z._)`${H.default.errors} === 0`));
}
function y_({ gen: e, evaluated: t, props: r, items: n }) {
  r instanceof z.Name && e.assign((0, z._)`${t}.props`, r), n instanceof z.Name && e.assign((0, z._)`${t}.items`, n);
}
function cc(e, t, r, n) {
  const { gen: s, schema: a, data: o, allErrors: u, opts: c, self: d } = e, { RULES: l } = d;
  if (a.$ref && (c.ignoreKeywordsWithRef || !(0, pt.schemaHasRulesButRef)(a, l))) {
    s.block(() => Fu(e, "$ref", l.all.$ref.definition));
    return;
  }
  c.jtd || g_(e, t), s.block(() => {
    for (const S of l.rules)
      h(S);
    h(l.post);
  });
  function h(S) {
    (0, Io.shouldUseGroup)(a, S) && (S.type ? (s.if((0, rs.checkDataType)(S.type, o, c.strictNumbers)), lc(e, S), t.length === 1 && t[0] === S.type && r && (s.else(), (0, rs.reportTypeError)(e)), s.endIf()) : lc(e, S), u || s.if((0, z._)`${H.default.errors} === ${n || 0}`));
  }
}
function lc(e, t) {
  const { gen: r, schema: n, opts: { useDefaults: s } } = e;
  s && (0, n_.assignDefaults)(e, t.type), r.block(() => {
    for (const a of t.rules)
      (0, Io.shouldUseRule)(n, a) && Fu(e, a.keyword, a.definition, t.type);
  });
}
function g_(e, t) {
  e.schemaEnv.meta || !e.opts.strictTypes || (__(e, t), e.opts.allowUnionTypes || v_(e, t), w_(e, e.dataTypes));
}
function __(e, t) {
  if (t.length) {
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    t.forEach((r) => {
      Lu(e.dataTypes, r) || To(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }), b_(e, t);
  }
}
function v_(e, t) {
  t.length > 1 && !(t.length === 2 && t.includes("null")) && To(e, "use allowUnionTypes to allow union type keyword");
}
function w_(e, t) {
  const r = e.self.RULES.all;
  for (const n in r) {
    const s = r[n];
    if (typeof s == "object" && (0, Io.shouldUseRule)(e.schema, s)) {
      const { type: a } = s.definition;
      a.length && !a.some((o) => E_(t, o)) && To(e, `missing type "${a.join(",")}" for keyword "${n}"`);
    }
  }
}
function E_(e, t) {
  return e.includes(t) || t === "number" && e.includes("integer");
}
function Lu(e, t) {
  return e.includes(t) || t === "integer" && e.includes("number");
}
function b_(e, t) {
  const r = [];
  for (const n of e.dataTypes)
    Lu(t, n) ? r.push(n) : t.includes("integer") && n === "number" && r.push("integer");
  e.dataTypes = r;
}
function To(e, t) {
  const r = e.schemaEnv.baseId + e.errSchemaPath;
  t += ` at "${r}" (strictTypes)`, (0, pt.checkStrictMode)(e, t, e.opts.strictTypes);
}
class Vu {
  constructor(t, r, n) {
    if ((0, sn.validateKeywordUsage)(t, r, n), this.gen = t.gen, this.allErrors = t.allErrors, this.keyword = n, this.data = t.data, this.schema = t.schema[n], this.$data = r.$data && t.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, pt.schemaRefOrVal)(t, this.schema, n, this.$data), this.schemaType = r.schemaType, this.parentSchema = t.schema, this.params = {}, this.it = t, this.def = r, this.$data)
      this.schemaCode = t.gen.const("vSchema", zu(this.$data, t));
    else if (this.schemaCode = this.schemaValue, !(0, sn.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${n} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = t.gen.const("_errs", H.default.errors));
  }
  result(t, r, n) {
    this.failResult((0, z.not)(t), r, n);
  }
  failResult(t, r, n) {
    this.gen.if(t), n ? n() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(t, r) {
    this.failResult((0, z.not)(t), void 0, r);
  }
  fail(t) {
    if (t === void 0) {
      this.error(), this.allErrors || this.gen.if(!1);
      return;
    }
    this.gen.if(t), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  fail$data(t) {
    if (!this.$data)
      return this.fail(t);
    const { schemaCode: r } = this;
    this.fail((0, z._)`${r} !== undefined && (${(0, z.or)(this.invalid$data(), t)})`);
  }
  error(t, r, n) {
    if (r) {
      this.setParams(r), this._error(t, n), this.setParams({});
      return;
    }
    this._error(t, n);
  }
  _error(t, r) {
    (t ? Xr.reportExtraError : Xr.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, Xr.reportError)(this, this.def.$dataError || Xr.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, Xr.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(t) {
    this.allErrors || this.gen.if(t);
  }
  setParams(t, r) {
    r ? Object.assign(this.params, t) : this.params = t;
  }
  block$data(t, r, n = z.nil) {
    this.gen.block(() => {
      this.check$data(t, n), r();
    });
  }
  check$data(t = z.nil, r = z.nil) {
    if (!this.$data)
      return;
    const { gen: n, schemaCode: s, schemaType: a, def: o } = this;
    n.if((0, z.or)((0, z._)`${s} === undefined`, r)), t !== z.nil && n.assign(t, !0), (a.length || o.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), t !== z.nil && n.assign(t, !1)), n.else();
  }
  invalid$data() {
    const { gen: t, schemaCode: r, schemaType: n, def: s, it: a } = this;
    return (0, z.or)(o(), u());
    function o() {
      if (n.length) {
        if (!(r instanceof z.Name))
          throw new Error("ajv implementation error");
        const c = Array.isArray(n) ? n : [n];
        return (0, z._)`${(0, rs.checkDataTypes)(c, r, a.opts.strictNumbers, rs.DataType.Wrong)}`;
      }
      return z.nil;
    }
    function u() {
      if (s.validateSchema) {
        const c = t.scopeValue("validate$data", { ref: s.validateSchema });
        return (0, z._)`!${c}(${r})`;
      }
      return z.nil;
    }
  }
  subschema(t, r) {
    const n = (0, Ds.getSubschema)(this.it, t);
    (0, Ds.extendSubschemaData)(n, this.it, t), (0, Ds.extendSubschemaMode)(n, t);
    const s = { ...this.it, ...n, items: void 0, props: void 0 };
    return u_(s, r), s;
  }
  mergeEvaluated(t, r) {
    const { it: n, gen: s } = this;
    n.opts.unevaluated && (n.props !== !0 && t.props !== void 0 && (n.props = pt.mergeEvaluated.props(s, t.props, n.props, r)), n.items !== !0 && t.items !== void 0 && (n.items = pt.mergeEvaluated.items(s, t.items, n.items, r)));
  }
  mergeValidEvaluated(t, r) {
    const { it: n, gen: s } = this;
    if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0))
      return s.if(r, () => this.mergeEvaluated(t, z.Name)), !0;
  }
}
xe.KeywordCxt = Vu;
function Fu(e, t, r, n) {
  const s = new Vu(e, r, t);
  "code" in r ? r.code(s, n) : s.$data && r.validate ? (0, sn.funcKeywordCode)(s, r) : "macro" in r ? (0, sn.macroKeywordCode)(s, r) : (r.compile || r.validate) && (0, sn.funcKeywordCode)(s, r);
}
const S_ = /^\/(?:[^~]|~0|~1)*$/, P_ = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function zu(e, { dataLevel: t, dataNames: r, dataPathArr: n }) {
  let s, a;
  if (e === "")
    return H.default.rootData;
  if (e[0] === "/") {
    if (!S_.test(e))
      throw new Error(`Invalid JSON-pointer: ${e}`);
    s = e, a = H.default.rootData;
  } else {
    const d = P_.exec(e);
    if (!d)
      throw new Error(`Invalid JSON-pointer: ${e}`);
    const l = +d[1];
    if (s = d[2], s === "#") {
      if (l >= t)
        throw new Error(c("property/index", l));
      return n[t - l];
    }
    if (l > t)
      throw new Error(c("data", l));
    if (a = r[t - l], !s)
      return a;
  }
  let o = a;
  const u = s.split("/");
  for (const d of u)
    d && (a = (0, z._)`${a}${(0, z.getProperty)((0, pt.unescapeJsonPointer)(d))}`, o = (0, z._)`${o} && ${a}`);
  return o;
  function c(d, l) {
    return `Cannot access ${d} ${l} levels up, current level is ${t}`;
  }
}
xe.getData = zu;
var Nn = {}, uc;
function jo() {
  if (uc) return Nn;
  uc = 1, Object.defineProperty(Nn, "__esModule", { value: !0 });
  class e extends Error {
    constructor(r) {
      super("validation failed"), this.errors = r, this.ajv = this.validation = !0;
    }
  }
  return Nn.default = e, Nn;
}
var Vr = {};
Object.defineProperty(Vr, "__esModule", { value: !0 });
const Ms = we;
class N_ extends Error {
  constructor(t, r, n, s) {
    super(s || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, Ms.resolveUrl)(t, r, n), this.missingSchema = (0, Ms.normalizeId)((0, Ms.getFullPath)(t, this.missingRef));
  }
}
Vr.default = N_;
var Le = {};
Object.defineProperty(Le, "__esModule", { value: !0 });
Le.resolveSchema = Le.getCompilingSchema = Le.resolveRef = Le.compileSchema = Le.SchemaEnv = void 0;
const Xe = Z, R_ = jo(), Wt = ct, Qe = we, dc = C, O_ = xe;
class $s {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, Qe.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
}
Le.SchemaEnv = $s;
function Ao(e) {
  const t = Uu.call(this, e);
  if (t)
    return t;
  const r = (0, Qe.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new Xe.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let u;
  e.$async && (u = o.scopeValue("Error", {
    ref: R_.default,
    code: (0, Xe._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = o.scopeName("validate");
  e.validateName = c;
  const d = {
    gen: o,
    allErrors: this.opts.allErrors,
    data: Wt.default.data,
    parentData: Wt.default.parentData,
    parentDataProperty: Wt.default.parentDataProperty,
    dataNames: [Wt.default.data],
    dataPathArr: [Xe.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: o.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, Xe.stringify)(e.schema) } : { ref: e.schema }),
    validateName: c,
    ValidationError: u,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: Xe.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, Xe._)`""`,
    opts: this.opts,
    self: this
  };
  let l;
  try {
    this._compilations.add(e), (0, O_.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    l = `${o.scopeRefs(Wt.default.scope)}return ${h}`, this.opts.code.process && (l = this.opts.code.process(l, e));
    const g = new Function(`${Wt.default.self}`, `${Wt.default.scope}`, l)(this, this.scope.get());
    if (this.scope.value(c, { ref: g }), g.errors = null, g.schema = e.schema, g.schemaEnv = e, e.$async && (g.$async = !0), this.opts.code.source === !0 && (g.source = { validateName: c, validateCode: h, scopeValues: o._values }), this.opts.unevaluated) {
      const { props: w, items: _ } = d;
      g.evaluated = {
        props: w instanceof Xe.Name ? void 0 : w,
        items: _ instanceof Xe.Name ? void 0 : _,
        dynamicProps: w instanceof Xe.Name,
        dynamicItems: _ instanceof Xe.Name
      }, g.source && (g.source.evaluated = (0, Xe.stringify)(g.evaluated));
    }
    return e.validate = g, e;
  } catch (h) {
    throw delete e.validate, delete e.validateName, l && this.logger.error("Error compiling schema, function code:", l), h;
  } finally {
    this._compilations.delete(e);
  }
}
Le.compileSchema = Ao;
function I_(e, t, r) {
  var n;
  r = (0, Qe.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = A_.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: u } = this.opts;
    o && (a = new $s({ schema: o, schemaId: u, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = T_.call(this, a);
}
Le.resolveRef = I_;
function T_(e) {
  return (0, Qe.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : Ao.call(this, e);
}
function Uu(e) {
  for (const t of this._compilations)
    if (j_(t, e))
      return t;
}
Le.getCompilingSchema = Uu;
function j_(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function A_(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || ys.call(this, e, t);
}
function ys(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, Qe._getFullPath)(this.opts.uriResolver, r);
  let s = (0, Qe.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return Ls.call(this, r, e);
  const a = (0, Qe.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const u = ys.call(this, e, o);
    return typeof (u == null ? void 0 : u.schema) != "object" ? void 0 : Ls.call(this, r, u);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || Ao.call(this, o), a === (0, Qe.normalizeId)(t)) {
      const { schema: u } = o, { schemaId: c } = this.opts, d = u[c];
      return d && (s = (0, Qe.resolveUrl)(this.opts.uriResolver, s, d)), new $s({ schema: u, schemaId: c, root: e, baseId: s });
    }
    return Ls.call(this, r, o);
  }
}
Le.resolveSchema = ys;
const k_ = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function Ls(e, { baseId: t, schema: r, root: n }) {
  var s;
  if (((s = e.fragment) === null || s === void 0 ? void 0 : s[0]) !== "/")
    return;
  for (const u of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, dc.unescapeFragment)(u)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !k_.has(u) && d && (t = (0, Qe.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, dc.schemaHasRulesButRef)(r, this.RULES)) {
    const u = (0, Qe.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = ys.call(this, n, u);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new $s({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const C_ = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", D_ = "Meta-schema for $data reference (JSON AnySchema extension proposal)", M_ = "object", L_ = [
  "$data"
], V_ = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
}, F_ = !1, z_ = {
  $id: C_,
  description: D_,
  type: M_,
  required: L_,
  properties: V_,
  additionalProperties: F_
};
var ko = {};
Object.defineProperty(ko, "__esModule", { value: !0 });
const qu = Ql;
qu.code = 'require("ajv/dist/runtime/uri").default';
ko.default = qu;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = xe;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return t.KeywordCxt;
  } });
  var r = Z;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return r._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return r.str;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return r.stringify;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return r.nil;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return r.Name;
  } }), Object.defineProperty(e, "CodeGen", { enumerable: !0, get: function() {
    return r.CodeGen;
  } });
  const n = jo(), s = Vr, a = lr, o = Le, u = Z, c = we, d = $e, l = C, h = z_, S = ko, g = (P, p) => new RegExp(P, p);
  g.code = "new RegExp";
  const w = ["removeAdditional", "useDefaults", "coerceTypes"], _ = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]), y = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  }, m = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  }, v = 200;
  function N(P) {
    var p, b, $, i, f, E, T, I, D, L, re, Ve, Ct, Dt, Mt, Lt, Vt, Ft, zt, Ut, qt, Kt, Gt, Ht, Bt;
    const Ge = P.strict, Xt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, Ur = Xt === !0 || Xt === void 0 ? 1 : Xt || 0, qr = ($ = (b = P.code) === null || b === void 0 ? void 0 : b.regExp) !== null && $ !== void 0 ? $ : g, Ss = (i = P.uriResolver) !== null && i !== void 0 ? i : S.default;
    return {
      strictSchema: (E = (f = P.strictSchema) !== null && f !== void 0 ? f : Ge) !== null && E !== void 0 ? E : !0,
      strictNumbers: (I = (T = P.strictNumbers) !== null && T !== void 0 ? T : Ge) !== null && I !== void 0 ? I : !0,
      strictTypes: (L = (D = P.strictTypes) !== null && D !== void 0 ? D : Ge) !== null && L !== void 0 ? L : "log",
      strictTuples: (Ve = (re = P.strictTuples) !== null && re !== void 0 ? re : Ge) !== null && Ve !== void 0 ? Ve : "log",
      strictRequired: (Dt = (Ct = P.strictRequired) !== null && Ct !== void 0 ? Ct : Ge) !== null && Dt !== void 0 ? Dt : !1,
      code: P.code ? { ...P.code, optimize: Ur, regExp: qr } : { optimize: Ur, regExp: qr },
      loopRequired: (Mt = P.loopRequired) !== null && Mt !== void 0 ? Mt : v,
      loopEnum: (Lt = P.loopEnum) !== null && Lt !== void 0 ? Lt : v,
      meta: (Vt = P.meta) !== null && Vt !== void 0 ? Vt : !0,
      messages: (Ft = P.messages) !== null && Ft !== void 0 ? Ft : !0,
      inlineRefs: (zt = P.inlineRefs) !== null && zt !== void 0 ? zt : !0,
      schemaId: (Ut = P.schemaId) !== null && Ut !== void 0 ? Ut : "$id",
      addUsedSchema: (qt = P.addUsedSchema) !== null && qt !== void 0 ? qt : !0,
      validateSchema: (Kt = P.validateSchema) !== null && Kt !== void 0 ? Kt : !0,
      validateFormats: (Gt = P.validateFormats) !== null && Gt !== void 0 ? Gt : !0,
      unicodeRegExp: (Ht = P.unicodeRegExp) !== null && Ht !== void 0 ? Ht : !0,
      int32range: (Bt = P.int32range) !== null && Bt !== void 0 ? Bt : !0,
      uriResolver: Ss
    };
  }
  class R {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = /* @__PURE__ */ Object.create(null), this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...N(p) };
      const { es5: b, lines: $ } = this.opts.code;
      this.scope = new u.ValueScope({ scope: {}, prefixes: _, es5: b, lines: $ }), this.logger = q(p.logger);
      const i = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, a.getRules)(), O.call(this, y, p, "NOT SUPPORTED"), O.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = me.call(this), p.formats && le.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && de.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), B.call(this), p.validateFormats = i;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: b, schemaId: $ } = this.opts;
      let i = h;
      $ === "id" && (i = { ...h }, i.id = i.$id, delete i.$id), b && p && this.addMetaSchema(i, i[$], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: b } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[b] || p : void 0;
    }
    validate(p, b) {
      let $;
      if (typeof p == "string") {
        if ($ = this.getSchema(p), !$)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        $ = this.compile(p);
      const i = $(b);
      return "$async" in $ || (this.errors = $.errors), i;
    }
    compile(p, b) {
      const $ = this._addSchema(p, b);
      return $.validate || this._compileSchemaEnv($);
    }
    compileAsync(p, b) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: $ } = this.opts;
      return i.call(this, p, b);
      async function i(L, re) {
        await f.call(this, L.$schema);
        const Ve = this._addSchema(L, re);
        return Ve.validate || E.call(this, Ve);
      }
      async function f(L) {
        L && !this.getSchema(L) && await i.call(this, { $ref: L }, !0);
      }
      async function E(L) {
        try {
          return this._compileSchemaEnv(L);
        } catch (re) {
          if (!(re instanceof s.default))
            throw re;
          return T.call(this, re), await I.call(this, re.missingSchema), E.call(this, L);
        }
      }
      function T({ missingSchema: L, missingRef: re }) {
        if (this.refs[L])
          throw new Error(`AnySchema ${L} is loaded but ${re} cannot be resolved`);
      }
      async function I(L) {
        const re = await D.call(this, L);
        this.refs[L] || await f.call(this, re.$schema), this.refs[L] || this.addSchema(re, L, b);
      }
      async function D(L) {
        const re = this._loading[L];
        if (re)
          return re;
        try {
          return await (this._loading[L] = $(L));
        } finally {
          delete this._loading[L];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, b, $, i = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const E of p)
          this.addSchema(E, void 0, $, i);
        return this;
      }
      let f;
      if (typeof p == "object") {
        const { schemaId: E } = this.opts;
        if (f = p[E], f !== void 0 && typeof f != "string")
          throw new Error(`schema ${E} must be string`);
      }
      return b = (0, c.normalizeId)(b || f), this._checkUnique(b), this.schemas[b] = this._addSchema(p, $, b, i, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, b, $ = this.opts.validateSchema) {
      return this.addSchema(p, b, !0, $), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, b) {
      if (typeof p == "boolean")
        return !0;
      let $;
      if ($ = p.$schema, $ !== void 0 && typeof $ != "string")
        throw new Error("$schema must be a string");
      if ($ = $ || this.opts.defaultMeta || this.defaultMeta(), !$)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const i = this.validate($, p);
      if (!i && b) {
        const f = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(f);
        else
          throw new Error(f);
      }
      return i;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(p) {
      let b;
      for (; typeof (b = U.call(this, p)) == "string"; )
        p = b;
      if (b === void 0) {
        const { schemaId: $ } = this.opts, i = new o.SchemaEnv({ schema: {}, schemaId: $ });
        if (b = o.resolveSchema.call(this, i, p), !b)
          return;
        this.refs[p] = b;
      }
      return b.validate || this._compileSchemaEnv(b);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(p) {
      if (p instanceof RegExp)
        return this._removeAllSchemas(this.schemas, p), this._removeAllSchemas(this.refs, p), this;
      switch (typeof p) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          const b = U.call(this, p);
          return typeof b == "object" && this._cache.delete(b.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const b = p;
          this._cache.delete(b);
          let $ = p[this.opts.schemaId];
          return $ && ($ = (0, c.normalizeId)($), delete this.schemas[$], delete this.refs[$]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const b of p)
        this.addKeyword(b);
      return this;
    }
    addKeyword(p, b) {
      let $;
      if (typeof p == "string")
        $ = p, typeof b == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), b.keyword = $);
      else if (typeof p == "object" && b === void 0) {
        if (b = p, $ = b.keyword, Array.isArray($) && !$.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (K.call(this, $, b), !b)
        return (0, l.eachItem)($, (f) => oe.call(this, f)), this;
      A.call(this, b);
      const i = {
        ...b,
        type: (0, d.getJSONTypes)(b.type),
        schemaType: (0, d.getJSONTypes)(b.schemaType)
      };
      return (0, l.eachItem)($, i.type.length === 0 ? (f) => oe.call(this, f, i) : (f) => i.type.forEach((E) => oe.call(this, f, i, E))), this;
    }
    getKeyword(p) {
      const b = this.RULES.all[p];
      return typeof b == "object" ? b.definition : !!b;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: b } = this;
      delete b.keywords[p], delete b.all[p];
      for (const $ of b.rules) {
        const i = $.rules.findIndex((f) => f.keyword === p);
        i >= 0 && $.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, b) {
      return typeof b == "string" && (b = new RegExp(b)), this.formats[p] = b, this;
    }
    errorsText(p = this.errors, { separator: b = ", ", dataVar: $ = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((i) => `${$}${i.instancePath} ${i.message}`).reduce((i, f) => i + b + f);
    }
    $dataMetaSchema(p, b) {
      const $ = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const i of b) {
        const f = i.split("/").slice(1);
        let E = p;
        for (const T of f)
          E = E[T];
        for (const T in $) {
          const I = $[T];
          if (typeof I != "object")
            continue;
          const { $data: D } = I.definition, L = E[T];
          D && L && (E[T] = M(L));
        }
      }
      return p;
    }
    _removeAllSchemas(p, b) {
      for (const $ in p) {
        const i = p[$];
        (!b || b.test($)) && (typeof i == "string" ? delete p[$] : i && !i.meta && (this._cache.delete(i.schema), delete p[$]));
      }
    }
    _addSchema(p, b, $, i = this.opts.validateSchema, f = this.opts.addUsedSchema) {
      let E;
      const { schemaId: T } = this.opts;
      if (typeof p == "object")
        E = p[T];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let I = this._cache.get(p);
      if (I !== void 0)
        return I;
      $ = (0, c.normalizeId)(E || $);
      const D = c.getSchemaRefs.call(this, p, $);
      return I = new o.SchemaEnv({ schema: p, schemaId: T, meta: b, baseId: $, localRefs: D }), this._cache.set(I.schema, I), f && !$.startsWith("#") && ($ && this._checkUnique($), this.refs[$] = I), i && this.validateSchema(p, !0), I;
    }
    _checkUnique(p) {
      if (this.schemas[p] || this.refs[p])
        throw new Error(`schema with key or id "${p}" already exists`);
    }
    _compileSchemaEnv(p) {
      if (p.meta ? this._compileMetaSchema(p) : o.compileSchema.call(this, p), !p.validate)
        throw new Error("ajv implementation error");
      return p.validate;
    }
    _compileMetaSchema(p) {
      const b = this.opts;
      this.opts = this._metaOpts;
      try {
        o.compileSchema.call(this, p);
      } finally {
        this.opts = b;
      }
    }
  }
  R.ValidationError = n.default, R.MissingRefError = s.default, e.default = R;
  function O(P, p, b, $ = "error") {
    for (const i in P) {
      const f = i;
      f in p && this.logger[$](`${b}: option ${i}. ${P[f]}`);
    }
  }
  function U(P) {
    return P = (0, c.normalizeId)(P), this.schemas[P] || this.refs[P];
  }
  function B() {
    const P = this.opts.schemas;
    if (P)
      if (Array.isArray(P))
        this.addSchema(P);
      else
        for (const p in P)
          this.addSchema(P[p], p);
  }
  function le() {
    for (const P in this.opts.formats) {
      const p = this.opts.formats[P];
      p && this.addFormat(P, p);
    }
  }
  function de(P) {
    if (Array.isArray(P)) {
      this.addVocabulary(P);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const p in P) {
      const b = P[p];
      b.keyword || (b.keyword = p), this.addKeyword(b);
    }
  }
  function me() {
    const P = { ...this.opts };
    for (const p of w)
      delete P[p];
    return P;
  }
  const V = { log() {
  }, warn() {
  }, error() {
  } };
  function q(P) {
    if (P === !1)
      return V;
    if (P === void 0)
      return console;
    if (P.log && P.warn && P.error)
      return P;
    throw new Error("logger must implement log, warn and error methods");
  }
  const ne = /^[a-z_$][a-z0-9_$:-]*$/i;
  function K(P, p) {
    const { RULES: b } = this;
    if ((0, l.eachItem)(P, ($) => {
      if (b.keywords[$])
        throw new Error(`Keyword ${$} is already defined`);
      if (!ne.test($))
        throw new Error(`Keyword ${$} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function oe(P, p, b) {
    var $;
    const i = p == null ? void 0 : p.post;
    if (b && i)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: f } = this;
    let E = i ? f.post : f.rules.find(({ type: I }) => I === b);
    if (E || (E = { type: b, rules: [] }, f.rules.push(E)), f.keywords[P] = !0, !p)
      return;
    const T = {
      keyword: P,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? Ee.call(this, E, T, p.before) : E.rules.push(T), f.all[P] = T, ($ = p.implements) === null || $ === void 0 || $.forEach((I) => this.addKeyword(I));
  }
  function Ee(P, p, b) {
    const $ = P.rules.findIndex((i) => i.keyword === b);
    $ >= 0 ? P.rules.splice($, 0, p) : (P.rules.push(p), this.logger.warn(`rule ${b} is not defined`));
  }
  function A(P) {
    let { metaSchema: p } = P;
    p !== void 0 && (P.$data && this.opts.$data && (p = M(p)), P.validateSchema = this.compile(p, !0));
  }
  const j = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function M(P) {
    return { anyOf: [P, j] };
  }
})(uu);
var Co = {}, Do = {}, Mo = {};
Object.defineProperty(Mo, "__esModule", { value: !0 });
const U_ = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
Mo.default = U_;
var ur = {};
Object.defineProperty(ur, "__esModule", { value: !0 });
ur.callRef = ur.getValidate = void 0;
const q_ = Vr, fc = te, Me = Z, pr = ct, hc = Le, Rn = C, K_ = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: u, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const l = hc.resolveRef.call(c, d, s, r);
    if (l === void 0)
      throw new q_.default(n.opts.uriResolver, s, r);
    if (l instanceof hc.SchemaEnv)
      return S(l);
    return g(l);
    function h() {
      if (a === d)
        return Bn(e, o, a, a.$async);
      const w = t.scopeValue("root", { ref: d });
      return Bn(e, (0, Me._)`${w}.validate`, d, d.$async);
    }
    function S(w) {
      const _ = Ku(e, w);
      Bn(e, _, w, w.$async);
    }
    function g(w) {
      const _ = t.scopeValue("schema", u.code.source === !0 ? { ref: w, code: (0, Me.stringify)(w) } : { ref: w }), y = t.name("valid"), m = e.subschema({
        schema: w,
        dataTypes: [],
        schemaPath: Me.nil,
        topSchemaRef: _,
        errSchemaPath: r
      }, y);
      e.mergeEvaluated(m), e.ok(y);
    }
  }
};
function Ku(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, Me._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
ur.getValidate = Ku;
function Bn(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: u, opts: c } = a, d = c.passContext ? pr.default.this : Me.nil;
  n ? l() : h();
  function l() {
    if (!u.$async)
      throw new Error("async schema referenced by sync schema");
    const w = s.let("valid");
    s.try(() => {
      s.code((0, Me._)`await ${(0, fc.callValidateCode)(e, t, d)}`), g(t), o || s.assign(w, !0);
    }, (_) => {
      s.if((0, Me._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), S(_), o || s.assign(w, !1);
    }), e.ok(w);
  }
  function h() {
    e.result((0, fc.callValidateCode)(e, t, d), () => g(t), () => S(t));
  }
  function S(w) {
    const _ = (0, Me._)`${w}.errors`;
    s.assign(pr.default.vErrors, (0, Me._)`${pr.default.vErrors} === null ? ${_} : ${pr.default.vErrors}.concat(${_})`), s.assign(pr.default.errors, (0, Me._)`${pr.default.vErrors}.length`);
  }
  function g(w) {
    var _;
    if (!a.opts.unevaluated)
      return;
    const y = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (a.props !== !0)
      if (y && !y.dynamicProps)
        y.props !== void 0 && (a.props = Rn.mergeEvaluated.props(s, y.props, a.props));
      else {
        const m = s.var("props", (0, Me._)`${w}.evaluated.props`);
        a.props = Rn.mergeEvaluated.props(s, m, a.props, Me.Name);
      }
    if (a.items !== !0)
      if (y && !y.dynamicItems)
        y.items !== void 0 && (a.items = Rn.mergeEvaluated.items(s, y.items, a.items));
      else {
        const m = s.var("items", (0, Me._)`${w}.evaluated.items`);
        a.items = Rn.mergeEvaluated.items(s, m, a.items, Me.Name);
      }
  }
}
ur.callRef = Bn;
ur.default = K_;
Object.defineProperty(Do, "__esModule", { value: !0 });
const G_ = Mo, H_ = ur, B_ = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  G_.default,
  H_.default
];
Do.default = B_;
var Lo = {}, Vo = {};
Object.defineProperty(Vo, "__esModule", { value: !0 });
const ns = Z, bt = ns.operators, ss = {
  maximum: { okStr: "<=", ok: bt.LTE, fail: bt.GT },
  minimum: { okStr: ">=", ok: bt.GTE, fail: bt.LT },
  exclusiveMaximum: { okStr: "<", ok: bt.LT, fail: bt.GTE },
  exclusiveMinimum: { okStr: ">", ok: bt.GT, fail: bt.LTE }
}, X_ = {
  message: ({ keyword: e, schemaCode: t }) => (0, ns.str)`must be ${ss[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, ns._)`{comparison: ${ss[e].okStr}, limit: ${t}}`
}, J_ = {
  keyword: Object.keys(ss),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: X_,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, ns._)`${r} ${ss[t].fail} ${n} || isNaN(${r})`);
  }
};
Vo.default = J_;
var Fo = {};
Object.defineProperty(Fo, "__esModule", { value: !0 });
const an = Z, W_ = {
  message: ({ schemaCode: e }) => (0, an.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, an._)`{multipleOf: ${e}}`
}, Y_ = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: W_,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), u = a ? (0, an._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, an._)`${o} !== parseInt(${o})`;
    e.fail$data((0, an._)`(${n} === 0 || (${o} = ${r}/${n}, ${u}))`);
  }
};
Fo.default = Y_;
var zo = {}, Uo = {};
Object.defineProperty(Uo, "__esModule", { value: !0 });
function Gu(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
Uo.default = Gu;
Gu.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(zo, "__esModule", { value: !0 });
const tr = Z, Q_ = C, Z_ = Uo, x_ = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, tr.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, tr._)`{limit: ${e}}`
}, ev = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: x_,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? tr.operators.GT : tr.operators.LT, o = s.opts.unicode === !1 ? (0, tr._)`${r}.length` : (0, tr._)`${(0, Q_.useFunc)(e.gen, Z_.default)}(${r})`;
    e.fail$data((0, tr._)`${o} ${a} ${n}`);
  }
};
zo.default = ev;
var qo = {};
Object.defineProperty(qo, "__esModule", { value: !0 });
const tv = te, rv = C, Er = Z, nv = {
  message: ({ schemaCode: e }) => (0, Er.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, Er._)`{pattern: ${e}}`
}, sv = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: nv,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, u = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, Er._)`new RegExp` : (0, rv.useFunc)(t, c), l = t.let("valid");
      t.try(() => t.assign(l, (0, Er._)`${d}(${a}, ${u}).test(${r})`), () => t.assign(l, !1)), e.fail$data((0, Er._)`!${l}`);
    } else {
      const c = (0, tv.usePattern)(e, s);
      e.fail$data((0, Er._)`!${c}.test(${r})`);
    }
  }
};
qo.default = sv;
var Ko = {};
Object.defineProperty(Ko, "__esModule", { value: !0 });
const on = Z, av = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, on.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, on._)`{limit: ${e}}`
}, ov = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: av,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? on.operators.GT : on.operators.LT;
    e.fail$data((0, on._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
Ko.default = ov;
var Go = {};
Object.defineProperty(Go, "__esModule", { value: !0 });
const Jr = te, cn = Z, iv = C, cv = {
  message: ({ params: { missingProperty: e } }) => (0, cn.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, cn._)`{missingProperty: ${e}}`
}, lv = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: cv,
  code(e) {
    const { gen: t, schema: r, schemaCode: n, data: s, $data: a, it: o } = e, { opts: u } = o;
    if (!a && r.length === 0)
      return;
    const c = r.length >= u.loopRequired;
    if (o.allErrors ? d() : l(), u.strictRequired) {
      const g = e.parentSchema.properties, { definedProperties: w } = e.it;
      for (const _ of r)
        if ((g == null ? void 0 : g[_]) === void 0 && !w.has(_)) {
          const y = o.schemaEnv.baseId + o.errSchemaPath, m = `required property "${_}" is not defined at "${y}" (strictRequired)`;
          (0, iv.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(cn.nil, h);
      else
        for (const g of r)
          (0, Jr.checkReportMissingProp)(e, g);
    }
    function l() {
      const g = t.let("missing");
      if (c || a) {
        const w = t.let("valid", !0);
        e.block$data(w, () => S(g, w)), e.ok(w);
      } else
        t.if((0, Jr.checkMissingProp)(e, r, g)), (0, Jr.reportMissingProp)(e, g), t.else();
    }
    function h() {
      t.forOf("prop", n, (g) => {
        e.setParams({ missingProperty: g }), t.if((0, Jr.noPropertyInData)(t, s, g, u.ownProperties), () => e.error());
      });
    }
    function S(g, w) {
      e.setParams({ missingProperty: g }), t.forOf(g, n, () => {
        t.assign(w, (0, Jr.propertyInData)(t, s, g, u.ownProperties)), t.if((0, cn.not)(w), () => {
          e.error(), t.break();
        });
      }, cn.nil);
    }
  }
};
Go.default = lv;
var Ho = {};
Object.defineProperty(Ho, "__esModule", { value: !0 });
const ln = Z, uv = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, ln.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, ln._)`{limit: ${e}}`
}, dv = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: uv,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? ln.operators.GT : ln.operators.LT;
    e.fail$data((0, ln._)`${r}.length ${s} ${n}`);
  }
};
Ho.default = dv;
var Bo = {}, $n = {};
Object.defineProperty($n, "__esModule", { value: !0 });
const Hu = cs;
Hu.code = 'require("ajv/dist/runtime/equal").default';
$n.default = Hu;
Object.defineProperty(Bo, "__esModule", { value: !0 });
const Vs = $e, _e = Z, fv = C, hv = $n, mv = {
  message: ({ params: { i: e, j: t } }) => (0, _e.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, _e._)`{i: ${e}, j: ${t}}`
}, pv = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: mv,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, parentSchema: a, schemaCode: o, it: u } = e;
    if (!n && !s)
      return;
    const c = t.let("valid"), d = a.items ? (0, Vs.getSchemaTypes)(a.items) : [];
    e.block$data(c, l, (0, _e._)`${o} === false`), e.ok(c);
    function l() {
      const w = t.let("i", (0, _e._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: w, j: _ }), t.assign(c, !0), t.if((0, _e._)`${w} > 1`, () => (h() ? S : g)(w, _));
    }
    function h() {
      return d.length > 0 && !d.some((w) => w === "object" || w === "array");
    }
    function S(w, _) {
      const y = t.name("item"), m = (0, Vs.checkDataTypes)(d, y, u.opts.strictNumbers, Vs.DataType.Wrong), v = t.const("indices", (0, _e._)`{}`);
      t.for((0, _e._)`;${w}--;`, () => {
        t.let(y, (0, _e._)`${r}[${w}]`), t.if(m, (0, _e._)`continue`), d.length > 1 && t.if((0, _e._)`typeof ${y} == "string"`, (0, _e._)`${y} += "_"`), t.if((0, _e._)`typeof ${v}[${y}] == "number"`, () => {
          t.assign(_, (0, _e._)`${v}[${y}]`), e.error(), t.assign(c, !1).break();
        }).code((0, _e._)`${v}[${y}] = ${w}`);
      });
    }
    function g(w, _) {
      const y = (0, fv.useFunc)(t, hv.default), m = t.name("outer");
      t.label(m).for((0, _e._)`;${w}--;`, () => t.for((0, _e._)`${_} = ${w}; ${_}--;`, () => t.if((0, _e._)`${y}(${r}[${w}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Bo.default = pv;
var Xo = {};
Object.defineProperty(Xo, "__esModule", { value: !0 });
const ua = Z, $v = C, yv = $n, gv = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, ua._)`{allowedValue: ${e}}`
}, _v = {
  keyword: "const",
  $data: !0,
  error: gv,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, ua._)`!${(0, $v.useFunc)(t, yv.default)}(${r}, ${s})`) : e.fail((0, ua._)`${a} !== ${r}`);
  }
};
Xo.default = _v;
var Jo = {};
Object.defineProperty(Jo, "__esModule", { value: !0 });
const Qr = Z, vv = C, wv = $n, Ev = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Qr._)`{allowedValues: ${e}}`
}, bv = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: Ev,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const u = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, vv.useFunc)(t, wv.default));
    let l;
    if (u || n)
      l = t.let("valid"), e.block$data(l, h);
    else {
      if (!Array.isArray(s))
        throw new Error("ajv implementation error");
      const g = t.const("vSchema", a);
      l = (0, Qr.or)(...s.map((w, _) => S(g, _)));
    }
    e.pass(l);
    function h() {
      t.assign(l, !1), t.forOf("v", a, (g) => t.if((0, Qr._)`${d()}(${r}, ${g})`, () => t.assign(l, !0).break()));
    }
    function S(g, w) {
      const _ = s[w];
      return typeof _ == "object" && _ !== null ? (0, Qr._)`${d()}(${r}, ${g}[${w}])` : (0, Qr._)`${r} === ${_}`;
    }
  }
};
Jo.default = bv;
Object.defineProperty(Lo, "__esModule", { value: !0 });
const Sv = Vo, Pv = Fo, Nv = zo, Rv = qo, Ov = Ko, Iv = Go, Tv = Ho, jv = Bo, Av = Xo, kv = Jo, Cv = [
  // number
  Sv.default,
  Pv.default,
  // string
  Nv.default,
  Rv.default,
  // object
  Ov.default,
  Iv.default,
  // array
  Tv.default,
  jv.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  Av.default,
  kv.default
];
Lo.default = Cv;
var Wo = {}, Fr = {};
Object.defineProperty(Fr, "__esModule", { value: !0 });
Fr.validateAdditionalItems = void 0;
const rr = Z, da = C, Dv = {
  message: ({ params: { len: e } }) => (0, rr.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, rr._)`{limit: ${e}}`
}, Mv = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: Dv,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, da.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Bu(e, n);
  }
};
function Bu(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const u = r.const("len", (0, rr._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, rr._)`${u} <= ${t.length}`);
  else if (typeof n == "object" && !(0, da.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, rr._)`${u} <= ${t.length}`);
    r.if((0, rr.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, u, (l) => {
      e.subschema({ keyword: a, dataProp: l, dataPropType: da.Type.Num }, d), o.allErrors || r.if((0, rr.not)(d), () => r.break());
    });
  }
}
Fr.validateAdditionalItems = Bu;
Fr.default = Mv;
var Yo = {}, zr = {};
Object.defineProperty(zr, "__esModule", { value: !0 });
zr.validateTuple = void 0;
const mc = Z, Xn = C, Lv = te, Vv = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return Xu(e, "additionalItems", t);
    r.items = !0, !(0, Xn.alwaysValidSchema)(r, t) && e.ok((0, Lv.validateArray)(e));
  }
};
function Xu(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: u } = e;
  l(s), u.opts.unevaluated && r.length && u.items !== !0 && (u.items = Xn.mergeEvaluated.items(n, r.length, u.items));
  const c = n.name("valid"), d = n.const("len", (0, mc._)`${a}.length`);
  r.forEach((h, S) => {
    (0, Xn.alwaysValidSchema)(u, h) || (n.if((0, mc._)`${d} > ${S}`, () => e.subschema({
      keyword: o,
      schemaProp: S,
      dataProp: S
    }, c)), e.ok(c));
  });
  function l(h) {
    const { opts: S, errSchemaPath: g } = u, w = r.length, _ = w === h.minItems && (w === h.maxItems || h[t] === !1);
    if (S.strictTuples && !_) {
      const y = `"${o}" is ${w}-tuple, but minItems or maxItems/${t} are not specified or different at path "${g}"`;
      (0, Xn.checkStrictMode)(u, y, S.strictTuples);
    }
  }
}
zr.validateTuple = Xu;
zr.default = Vv;
Object.defineProperty(Yo, "__esModule", { value: !0 });
const Fv = zr, zv = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, Fv.validateTuple)(e, "items")
};
Yo.default = zv;
var Qo = {};
Object.defineProperty(Qo, "__esModule", { value: !0 });
const pc = Z, Uv = C, qv = te, Kv = Fr, Gv = {
  message: ({ params: { len: e } }) => (0, pc.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, pc._)`{limit: ${e}}`
}, Hv = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: Gv,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, Uv.alwaysValidSchema)(n, t) && (s ? (0, Kv.validateAdditionalItems)(e, s) : e.ok((0, qv.validateArray)(e)));
  }
};
Qo.default = Hv;
var Zo = {};
Object.defineProperty(Zo, "__esModule", { value: !0 });
const Ke = Z, On = C, Bv = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Ke.str)`must contain at least ${e} valid item(s)` : (0, Ke.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Ke._)`{minContains: ${e}}` : (0, Ke._)`{minContains: ${e}, maxContains: ${t}}`
}, Xv = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: Bv,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, u;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, u = d) : o = 1;
    const l = t.const("len", (0, Ke._)`${s}.length`);
    if (e.setParams({ min: o, max: u }), u === void 0 && o === 0) {
      (0, On.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (u !== void 0 && o > u) {
      (0, On.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, On.alwaysValidSchema)(a, r)) {
      let _ = (0, Ke._)`${l} >= ${o}`;
      u !== void 0 && (_ = (0, Ke._)`${_} && ${l} <= ${u}`), e.pass(_);
      return;
    }
    a.items = !0;
    const h = t.name("valid");
    u === void 0 && o === 1 ? g(h, () => t.if(h, () => t.break())) : o === 0 ? (t.let(h, !0), u !== void 0 && t.if((0, Ke._)`${s}.length > 0`, S)) : (t.let(h, !1), S()), e.result(h, () => e.reset());
    function S() {
      const _ = t.name("_valid"), y = t.let("count", 0);
      g(_, () => t.if(_, () => w(y)));
    }
    function g(_, y) {
      t.forRange("i", 0, l, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: On.Type.Num,
          compositeRule: !0
        }, _), y();
      });
    }
    function w(_) {
      t.code((0, Ke._)`${_}++`), u === void 0 ? t.if((0, Ke._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, Ke._)`${_} > ${u}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, Ke._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
Zo.default = Xv;
var Ju = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
  const t = Z, r = C, n = te;
  e.error = {
    message: ({ params: { property: c, depsCount: d, deps: l } }) => {
      const h = d === 1 ? "property" : "properties";
      return (0, t.str)`must have ${h} ${l} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: l, missingProperty: h } }) => (0, t._)`{property: ${c},
    missingProperty: ${h},
    depsCount: ${d},
    deps: ${l}}`
    // TODO change to reference
  };
  const s = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: e.error,
    code(c) {
      const [d, l] = a(c);
      o(c, d), u(c, l);
    }
  };
  function a({ schema: c }) {
    const d = {}, l = {};
    for (const h in c) {
      if (h === "__proto__")
        continue;
      const S = Array.isArray(c[h]) ? d : l;
      S[h] = c[h];
    }
    return [d, l];
  }
  function o(c, d = c.schema) {
    const { gen: l, data: h, it: S } = c;
    if (Object.keys(d).length === 0)
      return;
    const g = l.let("missing");
    for (const w in d) {
      const _ = d[w];
      if (_.length === 0)
        continue;
      const y = (0, n.propertyInData)(l, h, w, S.opts.ownProperties);
      c.setParams({
        property: w,
        depsCount: _.length,
        deps: _.join(", ")
      }), S.allErrors ? l.if(y, () => {
        for (const m of _)
          (0, n.checkReportMissingProp)(c, m);
      }) : (l.if((0, t._)`${y} && (${(0, n.checkMissingProp)(c, _, g)})`), (0, n.reportMissingProp)(c, g), l.else());
    }
  }
  e.validatePropertyDeps = o;
  function u(c, d = c.schema) {
    const { gen: l, data: h, keyword: S, it: g } = c, w = l.name("valid");
    for (const _ in d)
      (0, r.alwaysValidSchema)(g, d[_]) || (l.if(
        (0, n.propertyInData)(l, h, _, g.opts.ownProperties),
        () => {
          const y = c.subschema({ keyword: S, schemaProp: _ }, w);
          c.mergeValidEvaluated(y, w);
        },
        () => l.var(w, !0)
        // TODO var
      ), c.ok(w));
  }
  e.validateSchemaDeps = u, e.default = s;
})(Ju);
var xo = {};
Object.defineProperty(xo, "__esModule", { value: !0 });
const Wu = Z, Jv = C, Wv = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, Wu._)`{propertyName: ${e.propertyName}}`
}, Yv = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: Wv,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, Jv.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, Wu.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
xo.default = Yv;
var gs = {};
Object.defineProperty(gs, "__esModule", { value: !0 });
const In = te, We = Z, Qv = ct, Tn = C, Zv = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, We._)`{additionalProperty: ${e.additionalProperty}}`
}, xv = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: Zv,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: u, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, Tn.alwaysValidSchema)(o, r))
      return;
    const d = (0, In.allSchemaProperties)(n.properties), l = (0, In.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, We._)`${a} === ${Qv.default.errors}`);
    function h() {
      t.forIn("key", s, (y) => {
        !d.length && !l.length ? w(y) : t.if(S(y), () => w(y));
      });
    }
    function S(y) {
      let m;
      if (d.length > 8) {
        const v = (0, Tn.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, In.isOwnProperty)(t, v, y);
      } else d.length ? m = (0, We.or)(...d.map((v) => (0, We._)`${y} === ${v}`)) : m = We.nil;
      return l.length && (m = (0, We.or)(m, ...l.map((v) => (0, We._)`${(0, In.usePattern)(e, v)}.test(${y})`))), (0, We.not)(m);
    }
    function g(y) {
      t.code((0, We._)`delete ${s}[${y}]`);
    }
    function w(y) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        g(y);
        return;
      }
      if (r === !1) {
        e.setParams({ additionalProperty: y }), e.error(), u || t.break();
        return;
      }
      if (typeof r == "object" && !(0, Tn.alwaysValidSchema)(o, r)) {
        const m = t.name("valid");
        c.removeAdditional === "failing" ? (_(y, m, !1), t.if((0, We.not)(m), () => {
          e.reset(), g(y);
        })) : (_(y, m), u || t.if((0, We.not)(m), () => t.break()));
      }
    }
    function _(y, m, v) {
      const N = {
        keyword: "additionalProperties",
        dataProp: y,
        dataPropType: Tn.Type.Str
      };
      v === !1 && Object.assign(N, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(N, m);
    }
  }
};
gs.default = xv;
var ei = {};
Object.defineProperty(ei, "__esModule", { value: !0 });
const ew = xe, $c = te, Fs = C, yc = gs, tw = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && yc.default.code(new ew.KeywordCxt(a, yc.default, "additionalProperties"));
    const o = (0, $c.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = Fs.mergeEvaluated.props(t, (0, Fs.toHash)(o), a.props));
    const u = o.filter((h) => !(0, Fs.alwaysValidSchema)(a, r[h]));
    if (u.length === 0)
      return;
    const c = t.name("valid");
    for (const h of u)
      d(h) ? l(h) : (t.if((0, $c.propertyInData)(t, s, h, a.opts.ownProperties)), l(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
    function d(h) {
      return a.opts.useDefaults && !a.compositeRule && r[h].default !== void 0;
    }
    function l(h) {
      e.subschema({
        keyword: "properties",
        schemaProp: h,
        dataProp: h
      }, c);
    }
  }
};
ei.default = tw;
var ti = {};
Object.defineProperty(ti, "__esModule", { value: !0 });
const gc = te, jn = Z, _c = C, vc = C, rw = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, u = (0, gc.allSchemaProperties)(r), c = u.filter((_) => (0, _c.alwaysValidSchema)(a, r[_]));
    if (u.length === 0 || c.length === u.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, l = t.name("valid");
    a.props !== !0 && !(a.props instanceof jn.Name) && (a.props = (0, vc.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    S();
    function S() {
      for (const _ of u)
        d && g(_), a.allErrors ? w(_) : (t.var(l, !0), w(_), t.if(l));
    }
    function g(_) {
      for (const y in d)
        new RegExp(_).test(y) && (0, _c.checkStrictMode)(a, `property ${y} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function w(_) {
      t.forIn("key", n, (y) => {
        t.if((0, jn._)`${(0, gc.usePattern)(e, _)}.test(${y})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: y,
            dataPropType: vc.Type.Str
          }, l), a.opts.unevaluated && h !== !0 ? t.assign((0, jn._)`${h}[${y}]`, !0) : !m && !a.allErrors && t.if((0, jn.not)(l), () => t.break());
        });
      });
    }
  }
};
ti.default = rw;
var ri = {};
Object.defineProperty(ri, "__esModule", { value: !0 });
const nw = C, sw = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, nw.alwaysValidSchema)(n, r)) {
      e.fail();
      return;
    }
    const s = t.name("valid");
    e.subschema({
      keyword: "not",
      compositeRule: !0,
      createErrors: !1,
      allErrors: !1
    }, s), e.failResult(s, () => e.reset(), () => e.error());
  },
  error: { message: "must NOT be valid" }
};
ri.default = sw;
var ni = {};
Object.defineProperty(ni, "__esModule", { value: !0 });
const aw = te, ow = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: aw.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
ni.default = ow;
var si = {};
Object.defineProperty(si, "__esModule", { value: !0 });
const Jn = Z, iw = C, cw = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, Jn._)`{passingSchemas: ${e.passing}}`
}, lw = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: cw,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, it: s } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (s.opts.discriminator && n.discriminator)
      return;
    const a = r, o = t.let("valid", !1), u = t.let("passing", null), c = t.name("_valid");
    e.setParams({ passing: u }), t.block(d), e.result(o, () => e.reset(), () => e.error(!0));
    function d() {
      a.forEach((l, h) => {
        let S;
        (0, iw.alwaysValidSchema)(s, l) ? t.var(c, !0) : S = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, Jn._)`${c} && ${o}`).assign(o, !1).assign(u, (0, Jn._)`[${u}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(u, h), S && e.mergeEvaluated(S, Jn.Name);
        });
      });
    }
  }
};
si.default = lw;
var ai = {};
Object.defineProperty(ai, "__esModule", { value: !0 });
const uw = C, dw = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, uw.alwaysValidSchema)(n, a))
        return;
      const u = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(u);
    });
  }
};
ai.default = dw;
var oi = {};
Object.defineProperty(oi, "__esModule", { value: !0 });
const as = Z, Yu = C, fw = {
  message: ({ params: e }) => (0, as.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, as._)`{failingKeyword: ${e.ifClause}}`
}, hw = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: fw,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Yu.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = wc(n, "then"), a = wc(n, "else");
    if (!s && !a)
      return;
    const o = t.let("valid", !0), u = t.name("_valid");
    if (c(), e.reset(), s && a) {
      const l = t.let("ifClause");
      e.setParams({ ifClause: l }), t.if(u, d("then", l), d("else", l));
    } else s ? t.if(u, d("then")) : t.if((0, as.not)(u), d("else"));
    e.pass(o, () => e.error(!0));
    function c() {
      const l = e.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, u);
      e.mergeEvaluated(l);
    }
    function d(l, h) {
      return () => {
        const S = e.subschema({ keyword: l }, u);
        t.assign(o, u), e.mergeValidEvaluated(S, o), h ? t.assign(h, (0, as._)`${l}`) : e.setParams({ ifClause: l });
      };
    }
  }
};
function wc(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Yu.alwaysValidSchema)(e, r);
}
oi.default = hw;
var ii = {};
Object.defineProperty(ii, "__esModule", { value: !0 });
const mw = C, pw = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, mw.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
ii.default = pw;
Object.defineProperty(Wo, "__esModule", { value: !0 });
const $w = Fr, yw = Yo, gw = zr, _w = Qo, vw = Zo, ww = Ju, Ew = xo, bw = gs, Sw = ei, Pw = ti, Nw = ri, Rw = ni, Ow = si, Iw = ai, Tw = oi, jw = ii;
function Aw(e = !1) {
  const t = [
    // any
    Nw.default,
    Rw.default,
    Ow.default,
    Iw.default,
    Tw.default,
    jw.default,
    // object
    Ew.default,
    bw.default,
    ww.default,
    Sw.default,
    Pw.default
  ];
  return e ? t.push(yw.default, _w.default) : t.push($w.default, gw.default), t.push(vw.default), t;
}
Wo.default = Aw;
var ci = {}, li = {};
Object.defineProperty(li, "__esModule", { value: !0 });
const he = Z, kw = {
  message: ({ schemaCode: e }) => (0, he.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, he._)`{format: ${e}}`
}, Cw = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: kw,
  code(e, t) {
    const { gen: r, data: n, $data: s, schema: a, schemaCode: o, it: u } = e, { opts: c, errSchemaPath: d, schemaEnv: l, self: h } = u;
    if (!c.validateFormats)
      return;
    s ? S() : g();
    function S() {
      const w = r.scopeValue("formats", {
        ref: h.formats,
        code: c.code.formats
      }), _ = r.const("fDef", (0, he._)`${w}[${o}]`), y = r.let("fType"), m = r.let("format");
      r.if((0, he._)`typeof ${_} == "object" && !(${_} instanceof RegExp)`, () => r.assign(y, (0, he._)`${_}.type || "string"`).assign(m, (0, he._)`${_}.validate`), () => r.assign(y, (0, he._)`"string"`).assign(m, _)), e.fail$data((0, he.or)(v(), N()));
      function v() {
        return c.strictSchema === !1 ? he.nil : (0, he._)`${o} && !${m}`;
      }
      function N() {
        const R = l.$async ? (0, he._)`(${_}.async ? await ${m}(${n}) : ${m}(${n}))` : (0, he._)`${m}(${n})`, O = (0, he._)`(typeof ${m} == "function" ? ${R} : ${m}.test(${n}))`;
        return (0, he._)`${m} && ${m} !== true && ${y} === ${t} && !${O}`;
      }
    }
    function g() {
      const w = h.formats[a];
      if (!w) {
        v();
        return;
      }
      if (w === !0)
        return;
      const [_, y, m] = N(w);
      _ === t && e.pass(R());
      function v() {
        if (c.strictSchema === !1) {
          h.logger.warn(O());
          return;
        }
        throw new Error(O());
        function O() {
          return `unknown format "${a}" ignored in schema at path "${d}"`;
        }
      }
      function N(O) {
        const U = O instanceof RegExp ? (0, he.regexpCode)(O) : c.code.formats ? (0, he._)`${c.code.formats}${(0, he.getProperty)(a)}` : void 0, B = r.scopeValue("formats", { key: a, ref: O, code: U });
        return typeof O == "object" && !(O instanceof RegExp) ? [O.type || "string", O.validate, (0, he._)`${B}.validate`] : ["string", O, B];
      }
      function R() {
        if (typeof w == "object" && !(w instanceof RegExp) && w.async) {
          if (!l.$async)
            throw new Error("async format in sync schema");
          return (0, he._)`await ${m}(${n})`;
        }
        return typeof y == "function" ? (0, he._)`${m}(${n})` : (0, he._)`${m}.test(${n})`;
      }
    }
  }
};
li.default = Cw;
Object.defineProperty(ci, "__esModule", { value: !0 });
const Dw = li, Mw = [Dw.default];
ci.default = Mw;
var Ar = {};
Object.defineProperty(Ar, "__esModule", { value: !0 });
Ar.contentVocabulary = Ar.metadataVocabulary = void 0;
Ar.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
Ar.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(Co, "__esModule", { value: !0 });
const Lw = Do, Vw = Lo, Fw = Wo, zw = ci, Ec = Ar, Uw = [
  Lw.default,
  Vw.default,
  (0, Fw.default)(),
  zw.default,
  Ec.metadataVocabulary,
  Ec.contentVocabulary
];
Co.default = Uw;
var ui = {}, _s = {};
Object.defineProperty(_s, "__esModule", { value: !0 });
_s.DiscrError = void 0;
var bc;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(bc || (_s.DiscrError = bc = {}));
Object.defineProperty(ui, "__esModule", { value: !0 });
const gr = Z, fa = _s, Sc = Le, qw = Vr, Kw = C, Gw = {
  message: ({ params: { discrError: e, tagName: t } }) => e === fa.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, gr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, Hw = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: Gw,
  code(e) {
    const { gen: t, data: r, schema: n, parentSchema: s, it: a } = e, { oneOf: o } = s;
    if (!a.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const u = n.propertyName;
    if (typeof u != "string")
      throw new Error("discriminator: requires propertyName");
    if (n.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!o)
      throw new Error("discriminator: requires oneOf keyword");
    const c = t.let("valid", !1), d = t.const("tag", (0, gr._)`${r}${(0, gr.getProperty)(u)}`);
    t.if((0, gr._)`typeof ${d} == "string"`, () => l(), () => e.error(!1, { discrError: fa.DiscrError.Tag, tag: d, tagName: u })), e.ok(c);
    function l() {
      const g = S();
      t.if(!1);
      for (const w in g)
        t.elseIf((0, gr._)`${d} === ${w}`), t.assign(c, h(g[w]));
      t.else(), e.error(!1, { discrError: fa.DiscrError.Mapping, tag: d, tagName: u }), t.endIf();
    }
    function h(g) {
      const w = t.name("valid"), _ = e.subschema({ keyword: "oneOf", schemaProp: g }, w);
      return e.mergeEvaluated(_, gr.Name), w;
    }
    function S() {
      var g;
      const w = {}, _ = m(s);
      let y = !0;
      for (let R = 0; R < o.length; R++) {
        let O = o[R];
        if (O != null && O.$ref && !(0, Kw.schemaHasRulesButRef)(O, a.self.RULES)) {
          const B = O.$ref;
          if (O = Sc.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, B), O instanceof Sc.SchemaEnv && (O = O.schema), O === void 0)
            throw new qw.default(a.opts.uriResolver, a.baseId, B);
        }
        const U = (g = O == null ? void 0 : O.properties) === null || g === void 0 ? void 0 : g[u];
        if (typeof U != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${u}"`);
        y = y && (_ || m(O)), v(U, R);
      }
      if (!y)
        throw new Error(`discriminator: "${u}" must be required`);
      return w;
      function m({ required: R }) {
        return Array.isArray(R) && R.includes(u);
      }
      function v(R, O) {
        if (R.const)
          N(R.const, O);
        else if (R.enum)
          for (const U of R.enum)
            N(U, O);
        else
          throw new Error(`discriminator: "properties/${u}" must have "const" or "enum"`);
      }
      function N(R, O) {
        if (typeof R != "string" || R in w)
          throw new Error(`discriminator: "${u}" values must be unique strings`);
        w[R] = O;
      }
    }
  }
};
ui.default = Hw;
const Bw = "http://json-schema.org/draft-07/schema#", Xw = "http://json-schema.org/draft-07/schema#", Jw = "Core schema meta-schema", Ww = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        default: 0
      }
    ]
  },
  simpleTypes: {
    enum: [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: !0,
    default: []
  }
}, Yw = [
  "object",
  "boolean"
], Qw = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  default: !0,
  readOnly: {
    type: "boolean",
    default: !1
  },
  examples: {
    type: "array",
    items: !0
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    default: !0
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    default: !1
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    default: {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  const: !0,
  enum: {
    type: "array",
    items: !0,
    minItems: 1,
    uniqueItems: !0
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: !0
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  if: {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  else: {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
}, Zw = {
  $schema: Bw,
  $id: Xw,
  title: Jw,
  definitions: Ww,
  type: Yw,
  properties: Qw,
  default: !0
};
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv = void 0;
  const r = uu, n = Co, s = ui, a = Zw, o = ["/properties"], u = "http://json-schema.org/draft-07/schema";
  class c extends r.default {
    _addVocabularies() {
      super._addVocabularies(), n.default.forEach((w) => this.addVocabulary(w)), this.opts.discriminator && this.addKeyword(s.default);
    }
    _addDefaultMetaSchema() {
      if (super._addDefaultMetaSchema(), !this.opts.meta)
        return;
      const w = this.opts.$data ? this.$dataMetaSchema(a, o) : a;
      this.addMetaSchema(w, u, !1), this.refs["http://json-schema.org/schema"] = u;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(u) ? u : void 0);
    }
  }
  t.Ajv = c, e.exports = t = c, e.exports.Ajv = c, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = c;
  var d = xe;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return d.KeywordCxt;
  } });
  var l = Z;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return l._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return l.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return l.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return l.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return l.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return l.CodeGen;
  } });
  var h = jo();
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return h.default;
  } });
  var S = Vr;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return S.default;
  } });
})(aa, aa.exports);
var xw = aa.exports;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatLimitDefinition = void 0;
  const t = xw, r = Z, n = r.operators, s = {
    formatMaximum: { okStr: "<=", ok: n.LTE, fail: n.GT },
    formatMinimum: { okStr: ">=", ok: n.GTE, fail: n.LT },
    formatExclusiveMaximum: { okStr: "<", ok: n.LT, fail: n.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: n.GT, fail: n.LTE }
  }, a = {
    message: ({ keyword: u, schemaCode: c }) => (0, r.str)`should be ${s[u].okStr} ${c}`,
    params: ({ keyword: u, schemaCode: c }) => (0, r._)`{comparison: ${s[u].okStr}, limit: ${c}}`
  };
  e.formatLimitDefinition = {
    keyword: Object.keys(s),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: a,
    code(u) {
      const { gen: c, data: d, schemaCode: l, keyword: h, it: S } = u, { opts: g, self: w } = S;
      if (!g.validateFormats)
        return;
      const _ = new t.KeywordCxt(S, w.RULES.all.format.definition, "format");
      _.$data ? y() : m();
      function y() {
        const N = c.scopeValue("formats", {
          ref: w.formats,
          code: g.code.formats
        }), R = c.const("fmt", (0, r._)`${N}[${_.schemaCode}]`);
        u.fail$data((0, r.or)((0, r._)`typeof ${R} != "object"`, (0, r._)`${R} instanceof RegExp`, (0, r._)`typeof ${R}.compare != "function"`, v(R)));
      }
      function m() {
        const N = _.schema, R = w.formats[N];
        if (!R || R === !0)
          return;
        if (typeof R != "object" || R instanceof RegExp || typeof R.compare != "function")
          throw new Error(`"${h}": format "${N}" does not define "compare" function`);
        const O = c.scopeValue("formats", {
          key: N,
          ref: R,
          code: g.code.formats ? (0, r._)`${g.code.formats}${(0, r.getProperty)(N)}` : void 0
        });
        u.fail$data(v(O));
      }
      function v(N) {
        return (0, r._)`${N}.compare(${d}, ${l}) ${s[h].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const o = (u) => (u.addKeyword(e.formatLimitDefinition), u);
  e.default = o;
})(lu);
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 });
  const r = cu, n = lu, s = Z, a = new s.Name("fullFormats"), o = new s.Name("fastFormats"), u = (d, l = { keywords: !0 }) => {
    if (Array.isArray(l))
      return c(d, l, r.fullFormats, a), d;
    const [h, S] = l.mode === "fast" ? [r.fastFormats, o] : [r.fullFormats, a], g = l.formats || r.formatNames;
    return c(d, g, h, S), l.keywords && (0, n.default)(d), d;
  };
  u.get = (d, l = "full") => {
    const S = (l === "fast" ? r.fastFormats : r.fullFormats)[d];
    if (!S)
      throw new Error(`Unknown format "${d}"`);
    return S;
  };
  function c(d, l, h, S) {
    var g, w;
    (g = (w = d.opts.code).formats) !== null && g !== void 0 || (w.formats = (0, s._)`require("ajv-formats/dist/formats").${S}`);
    for (const _ of l)
      d.addFormat(_, h[_]);
  }
  e.exports = t = u, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = u;
})(sa, sa.exports);
var eE = sa.exports;
const tE = /* @__PURE__ */ sl(eE), rE = (e, t, r, n) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  const s = Object.getOwnPropertyDescriptor(e, r), a = Object.getOwnPropertyDescriptor(t, r);
  !nE(s, a) && n || Object.defineProperty(e, r, a);
}, nE = function(e, t) {
  return e === void 0 || e.configurable || e.writable === t.writable && e.enumerable === t.enumerable && e.configurable === t.configurable && (e.writable || e.value === t.value);
}, sE = (e, t) => {
  const r = Object.getPrototypeOf(t);
  r !== Object.getPrototypeOf(e) && Object.setPrototypeOf(e, r);
}, aE = (e, t) => `/* Wrapped ${e}*/
${t}`, oE = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), iE = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"), cE = (e, t, r) => {
  const n = r === "" ? "" : `with ${r.trim()}() `, s = aE.bind(null, n, t.toString());
  Object.defineProperty(s, "name", iE);
  const { writable: a, enumerable: o, configurable: u } = oE;
  Object.defineProperty(e, "toString", { value: s, writable: a, enumerable: o, configurable: u });
};
function lE(e, t, { ignoreNonConfigurable: r = !1 } = {}) {
  const { name: n } = e;
  for (const s of Reflect.ownKeys(t))
    rE(e, t, s, r);
  return sE(e, t), cE(e, t, n), e;
}
const Pc = (e, t = {}) => {
  if (typeof e != "function")
    throw new TypeError(`Expected the first argument to be a function, got \`${typeof e}\``);
  const {
    wait: r = 0,
    maxWait: n = Number.POSITIVE_INFINITY,
    before: s = !1,
    after: a = !0
  } = t;
  if (r < 0 || n < 0)
    throw new RangeError("`wait` and `maxWait` must not be negative.");
  if (!s && !a)
    throw new Error("Both `before` and `after` are false, function wouldn't be called.");
  let o, u, c;
  const d = function(...l) {
    const h = this, S = () => {
      o = void 0, u && (clearTimeout(u), u = void 0), a && (c = e.apply(h, l));
    }, g = () => {
      u = void 0, o && (clearTimeout(o), o = void 0), a && (c = e.apply(h, l));
    }, w = s && !o;
    return clearTimeout(o), o = setTimeout(S, r), n > 0 && n !== Number.POSITIVE_INFINITY && !u && (u = setTimeout(g, n)), w && (c = e.apply(h, l)), c;
  };
  return lE(d, e), d.cancel = () => {
    o && (clearTimeout(o), o = void 0), u && (clearTimeout(u), u = void 0);
  }, d;
};
var ha = { exports: {} };
const uE = "2.0.0", Qu = 256, dE = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, fE = 16, hE = Qu - 6, mE = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var yn = {
  MAX_LENGTH: Qu,
  MAX_SAFE_COMPONENT_LENGTH: fE,
  MAX_SAFE_BUILD_LENGTH: hE,
  MAX_SAFE_INTEGER: dE,
  RELEASE_TYPES: mE,
  SEMVER_SPEC_VERSION: uE,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const pE = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {
};
var vs = pE;
(function(e, t) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: r,
    MAX_SAFE_BUILD_LENGTH: n,
    MAX_LENGTH: s
  } = yn, a = vs;
  t = e.exports = {};
  const o = t.re = [], u = t.safeRe = [], c = t.src = [], d = t.safeSrc = [], l = t.t = {};
  let h = 0;
  const S = "[a-zA-Z0-9-]", g = [
    ["\\s", 1],
    ["\\d", s],
    [S, n]
  ], w = (y) => {
    for (const [m, v] of g)
      y = y.split(`${m}*`).join(`${m}{0,${v}}`).split(`${m}+`).join(`${m}{1,${v}}`);
    return y;
  }, _ = (y, m, v) => {
    const N = w(m), R = h++;
    a(y, R, m), l[y] = R, c[R] = m, d[R] = N, o[R] = new RegExp(m, v ? "g" : void 0), u[R] = new RegExp(N, v ? "g" : void 0);
  };
  _("NUMERICIDENTIFIER", "0|[1-9]\\d*"), _("NUMERICIDENTIFIERLOOSE", "\\d+"), _("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${S}*`), _("MAINVERSION", `(${c[l.NUMERICIDENTIFIER]})\\.(${c[l.NUMERICIDENTIFIER]})\\.(${c[l.NUMERICIDENTIFIER]})`), _("MAINVERSIONLOOSE", `(${c[l.NUMERICIDENTIFIERLOOSE]})\\.(${c[l.NUMERICIDENTIFIERLOOSE]})\\.(${c[l.NUMERICIDENTIFIERLOOSE]})`), _("PRERELEASEIDENTIFIER", `(?:${c[l.NONNUMERICIDENTIFIER]}|${c[l.NUMERICIDENTIFIER]})`), _("PRERELEASEIDENTIFIERLOOSE", `(?:${c[l.NONNUMERICIDENTIFIER]}|${c[l.NUMERICIDENTIFIERLOOSE]})`), _("PRERELEASE", `(?:-(${c[l.PRERELEASEIDENTIFIER]}(?:\\.${c[l.PRERELEASEIDENTIFIER]})*))`), _("PRERELEASELOOSE", `(?:-?(${c[l.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${c[l.PRERELEASEIDENTIFIERLOOSE]})*))`), _("BUILDIDENTIFIER", `${S}+`), _("BUILD", `(?:\\+(${c[l.BUILDIDENTIFIER]}(?:\\.${c[l.BUILDIDENTIFIER]})*))`), _("FULLPLAIN", `v?${c[l.MAINVERSION]}${c[l.PRERELEASE]}?${c[l.BUILD]}?`), _("FULL", `^${c[l.FULLPLAIN]}$`), _("LOOSEPLAIN", `[v=\\s]*${c[l.MAINVERSIONLOOSE]}${c[l.PRERELEASELOOSE]}?${c[l.BUILD]}?`), _("LOOSE", `^${c[l.LOOSEPLAIN]}$`), _("GTLT", "((?:<|>)?=?)"), _("XRANGEIDENTIFIERLOOSE", `${c[l.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), _("XRANGEIDENTIFIER", `${c[l.NUMERICIDENTIFIER]}|x|X|\\*`), _("XRANGEPLAIN", `[v=\\s]*(${c[l.XRANGEIDENTIFIER]})(?:\\.(${c[l.XRANGEIDENTIFIER]})(?:\\.(${c[l.XRANGEIDENTIFIER]})(?:${c[l.PRERELEASE]})?${c[l.BUILD]}?)?)?`), _("XRANGEPLAINLOOSE", `[v=\\s]*(${c[l.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[l.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[l.XRANGEIDENTIFIERLOOSE]})(?:${c[l.PRERELEASELOOSE]})?${c[l.BUILD]}?)?)?`), _("XRANGE", `^${c[l.GTLT]}\\s*${c[l.XRANGEPLAIN]}$`), _("XRANGELOOSE", `^${c[l.GTLT]}\\s*${c[l.XRANGEPLAINLOOSE]}$`), _("COERCEPLAIN", `(^|[^\\d])(\\d{1,${r}})(?:\\.(\\d{1,${r}}))?(?:\\.(\\d{1,${r}}))?`), _("COERCE", `${c[l.COERCEPLAIN]}(?:$|[^\\d])`), _("COERCEFULL", c[l.COERCEPLAIN] + `(?:${c[l.PRERELEASE]})?(?:${c[l.BUILD]})?(?:$|[^\\d])`), _("COERCERTL", c[l.COERCE], !0), _("COERCERTLFULL", c[l.COERCEFULL], !0), _("LONETILDE", "(?:~>?)"), _("TILDETRIM", `(\\s*)${c[l.LONETILDE]}\\s+`, !0), t.tildeTrimReplace = "$1~", _("TILDE", `^${c[l.LONETILDE]}${c[l.XRANGEPLAIN]}$`), _("TILDELOOSE", `^${c[l.LONETILDE]}${c[l.XRANGEPLAINLOOSE]}$`), _("LONECARET", "(?:\\^)"), _("CARETTRIM", `(\\s*)${c[l.LONECARET]}\\s+`, !0), t.caretTrimReplace = "$1^", _("CARET", `^${c[l.LONECARET]}${c[l.XRANGEPLAIN]}$`), _("CARETLOOSE", `^${c[l.LONECARET]}${c[l.XRANGEPLAINLOOSE]}$`), _("COMPARATORLOOSE", `^${c[l.GTLT]}\\s*(${c[l.LOOSEPLAIN]})$|^$`), _("COMPARATOR", `^${c[l.GTLT]}\\s*(${c[l.FULLPLAIN]})$|^$`), _("COMPARATORTRIM", `(\\s*)${c[l.GTLT]}\\s*(${c[l.LOOSEPLAIN]}|${c[l.XRANGEPLAIN]})`, !0), t.comparatorTrimReplace = "$1$2$3", _("HYPHENRANGE", `^\\s*(${c[l.XRANGEPLAIN]})\\s+-\\s+(${c[l.XRANGEPLAIN]})\\s*$`), _("HYPHENRANGELOOSE", `^\\s*(${c[l.XRANGEPLAINLOOSE]})\\s+-\\s+(${c[l.XRANGEPLAINLOOSE]})\\s*$`), _("STAR", "(<|>)?=?\\s*\\*"), _("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), _("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(ha, ha.exports);
var gn = ha.exports;
const $E = Object.freeze({ loose: !0 }), yE = Object.freeze({}), gE = (e) => e ? typeof e != "object" ? $E : e : yE;
var di = gE;
const Nc = /^[0-9]+$/, Zu = (e, t) => {
  if (typeof e == "number" && typeof t == "number")
    return e === t ? 0 : e < t ? -1 : 1;
  const r = Nc.test(e), n = Nc.test(t);
  return r && n && (e = +e, t = +t), e === t ? 0 : r && !n ? -1 : n && !r ? 1 : e < t ? -1 : 1;
}, _E = (e, t) => Zu(t, e);
var xu = {
  compareIdentifiers: Zu,
  rcompareIdentifiers: _E
};
const An = vs, { MAX_LENGTH: Rc, MAX_SAFE_INTEGER: kn } = yn, { safeRe: Cn, t: Dn } = gn, vE = di, { compareIdentifiers: ma } = xu, wE = (e, t) => {
  const r = t.split(".");
  if (r.length > e.length)
    return !1;
  for (let n = 0; n < r.length; n++)
    if (ma(e[n], r[n]) !== 0)
      return !1;
  return !0;
};
let EE = class rt {
  constructor(t, r) {
    if (r = vE(r), t instanceof rt) {
      if (t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease)
        return t;
      t = t.version;
    } else if (typeof t != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
    if (t.length > Rc)
      throw new TypeError(
        `version is longer than ${Rc} characters`
      );
    An("SemVer", t, r), this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease;
    const n = t.trim().match(r.loose ? Cn[Dn.LOOSE] : Cn[Dn.FULL]);
    if (!n)
      throw new TypeError(`Invalid Version: ${t}`);
    if (this.raw = t, this.major = +n[1], this.minor = +n[2], this.patch = +n[3], this.major > kn || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > kn || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > kn || this.patch < 0)
      throw new TypeError("Invalid patch version");
    n[4] ? this.prerelease = n[4].split(".").map((s) => {
      if (/^[0-9]+$/.test(s)) {
        const a = +s;
        if (a >= 0 && a < kn)
          return a;
      }
      return s;
    }) : this.prerelease = [], this.build = n[5] ? n[5].split(".") : [], this.format();
  }
  format() {
    return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
  }
  toString() {
    return this.version;
  }
  compare(t) {
    if (An("SemVer.compare", this.version, this.options, t), !(t instanceof rt)) {
      if (typeof t == "string" && t === this.version)
        return 0;
      t = new rt(t, this.options);
    }
    return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
  }
  compareMain(t) {
    return t instanceof rt || (t = new rt(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : this.patch > t.patch ? 1 : 0;
  }
  comparePre(t) {
    if (t instanceof rt || (t = new rt(t, this.options)), this.prerelease.length && !t.prerelease.length)
      return -1;
    if (!this.prerelease.length && t.prerelease.length)
      return 1;
    if (!this.prerelease.length && !t.prerelease.length)
      return 0;
    let r = 0;
    do {
      const n = this.prerelease[r], s = t.prerelease[r];
      if (An("prerelease compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return ma(n, s);
    } while (++r);
  }
  compareBuild(t) {
    t instanceof rt || (t = new rt(t, this.options));
    let r = 0;
    do {
      const n = this.build[r], s = t.build[r];
      if (An("build compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return ma(n, s);
    } while (++r);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(t, r, n) {
    if (t.startsWith("pre")) {
      if (!r && n === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (r) {
        const s = `-${r}`.match(this.options.loose ? Cn[Dn.PRERELEASELOOSE] : Cn[Dn.PRERELEASE]);
        if (!s || s[1] !== r)
          throw new Error(`invalid identifier: ${r}`);
      }
    }
    switch (t) {
      case "premajor":
        this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", r, n);
        break;
      case "preminor":
        this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", r, n);
        break;
      case "prepatch":
        this.prerelease.length = 0, this.inc("patch", r, n), this.inc("pre", r, n);
        break;
      case "prerelease":
        this.prerelease.length === 0 && this.inc("patch", r, n), this.inc("pre", r, n);
        break;
      case "release":
        if (this.prerelease.length === 0)
          throw new Error(`version ${this.raw} is not a prerelease`);
        this.prerelease.length = 0;
        break;
      case "major":
        (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
        break;
      case "minor":
        (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
        break;
      case "patch":
        this.prerelease.length === 0 && this.patch++, this.prerelease = [];
        break;
      case "pre": {
        const s = Number(n) ? 1 : 0;
        if (this.prerelease.length === 0)
          this.prerelease = [s];
        else {
          let a = this.prerelease.length;
          for (; --a >= 0; )
            typeof this.prerelease[a] == "number" && (this.prerelease[a]++, a = -2);
          if (a === -1) {
            if (r === this.prerelease.join(".") && n === !1)
              throw new Error("invalid increment argument: identifier already exists");
            this.prerelease.push(s);
          }
        }
        if (r) {
          let a = [r, s];
          if (n === !1 && (a = [r]), wE(this.prerelease, r)) {
            const o = this.prerelease[r.split(".").length];
            isNaN(o) && (this.prerelease = a);
          } else
            this.prerelease = a;
        }
        break;
      }
      default:
        throw new Error(`invalid increment argument: ${t}`);
    }
    return this.raw = this.format(), this.build.length && (this.raw += `+${this.build.join(".")}`), this;
  }
};
var Ie = EE;
const Oc = Ie, bE = (e, t, r = !1) => {
  if (e instanceof Oc)
    return e;
  try {
    return new Oc(e, t);
  } catch (n) {
    if (!r)
      return null;
    throw n;
  }
};
var dr = bE;
const SE = dr, PE = (e, t) => {
  const r = SE(e, t);
  return r ? r.version : null;
};
var NE = PE;
const RE = dr, OE = (e, t) => {
  const r = RE(e.trim().replace(/^[=v]+/, ""), t);
  return r ? r.version : null;
};
var IE = OE;
const Ic = Ie, TE = (e, t, r, n, s) => {
  typeof r == "string" && (s = n, n = r, r = void 0);
  try {
    return new Ic(
      e instanceof Ic ? e.version : e,
      r
    ).inc(t, n, s).version;
  } catch {
    return null;
  }
};
var jE = TE;
const Tc = dr, AE = (e, t) => {
  const r = Tc(e, null, !0), n = Tc(t, null, !0), s = r.compare(n);
  if (s === 0)
    return null;
  const a = s > 0, o = a ? r : n, u = a ? n : r, c = !!o.prerelease.length;
  if (!!u.prerelease.length && !c) {
    if (!u.patch && !u.minor)
      return "major";
    if (u.compareMain(o) === 0)
      return u.minor && !u.patch ? "minor" : "patch";
  }
  const l = c ? "pre" : "";
  return r.major !== n.major ? l + "major" : r.minor !== n.minor ? l + "minor" : r.patch !== n.patch ? l + "patch" : "prerelease";
};
var kE = AE;
const CE = Ie, DE = (e, t) => new CE(e, t).major;
var ME = DE;
const LE = Ie, VE = (e, t) => new LE(e, t).minor;
var FE = VE;
const zE = Ie, UE = (e, t) => new zE(e, t).patch;
var qE = UE;
const KE = dr, GE = (e, t) => {
  const r = KE(e, t);
  return r && r.prerelease.length ? r.prerelease : null;
};
var HE = GE;
const jc = Ie, BE = (e, t, r) => new jc(e, r).compare(new jc(t, r));
var et = BE;
const XE = et, JE = (e, t, r) => XE(t, e, r);
var WE = JE;
const YE = et, QE = (e, t) => YE(e, t, !0);
var ZE = QE;
const Ac = Ie, xE = (e, t, r) => {
  const n = new Ac(e, r), s = new Ac(t, r);
  return n.compare(s) || n.compareBuild(s);
};
var fi = xE;
const e1 = fi, t1 = (e, t) => e.sort((r, n) => e1(r, n, t));
var r1 = t1;
const n1 = fi, s1 = (e, t) => e.sort((r, n) => n1(n, r, t));
var a1 = s1;
const o1 = et, i1 = (e, t, r) => o1(e, t, r) > 0;
var ws = i1;
const c1 = et, l1 = (e, t, r) => c1(e, t, r) < 0;
var hi = l1;
const u1 = et, d1 = (e, t, r) => u1(e, t, r) === 0;
var ed = d1;
const f1 = et, h1 = (e, t, r) => f1(e, t, r) !== 0;
var td = h1;
const m1 = et, p1 = (e, t, r) => m1(e, t, r) >= 0;
var mi = p1;
const $1 = et, y1 = (e, t, r) => $1(e, t, r) <= 0;
var pi = y1;
const g1 = ed, _1 = td, v1 = ws, w1 = mi, E1 = hi, b1 = pi, S1 = (e, t, r, n) => {
  switch (t) {
    case "===":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e === r;
    case "!==":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e !== r;
    case "":
    case "=":
    case "==":
      return g1(e, r, n);
    case "!=":
      return _1(e, r, n);
    case ">":
      return v1(e, r, n);
    case ">=":
      return w1(e, r, n);
    case "<":
      return E1(e, r, n);
    case "<=":
      return b1(e, r, n);
    default:
      throw new TypeError(`Invalid operator: ${t}`);
  }
};
var rd = S1;
const P1 = Ie, N1 = dr, { safeRe: Mn, t: Ln } = gn, R1 = (e, t) => {
  if (e instanceof P1)
    return e;
  if (typeof e == "number" && (e = String(e)), typeof e != "string")
    return null;
  t = t || {};
  let r = null;
  if (!t.rtl)
    r = e.match(t.includePrerelease ? Mn[Ln.COERCEFULL] : Mn[Ln.COERCE]);
  else {
    const c = t.includePrerelease ? Mn[Ln.COERCERTLFULL] : Mn[Ln.COERCERTL];
    let d;
    for (; (d = c.exec(e)) && (!r || r.index + r[0].length !== e.length); )
      (!r || d.index + d[0].length !== r.index + r[0].length) && (r = d), c.lastIndex = d.index + d[1].length + d[2].length;
    c.lastIndex = -1;
  }
  if (r === null)
    return null;
  const n = r[2], s = r[3] || "0", a = r[4] || "0", o = t.includePrerelease && r[5] ? `-${r[5]}` : "", u = t.includePrerelease && r[6] ? `+${r[6]}` : "";
  return N1(`${n}.${s}.${a}${o}${u}`, t);
};
var O1 = R1;
const I1 = dr, T1 = yn, j1 = Ie, A1 = (e, t, r) => {
  if (!T1.RELEASE_TYPES.includes(t))
    return null;
  const n = k1(e, r);
  return n && C1(n, t);
}, k1 = (e, t) => {
  const r = e instanceof j1 ? e.version : e;
  return I1(r, t);
}, C1 = (e, t) => {
  if (D1(t))
    return e.version;
  switch (e.prerelease = [], t) {
    case "major":
      e.minor = 0, e.patch = 0;
      break;
    case "minor":
      e.patch = 0;
      break;
  }
  return e.format();
}, D1 = (e) => e.startsWith("pre");
var M1 = A1;
class L1 {
  constructor() {
    this.max = 1e3, this.map = /* @__PURE__ */ new Map();
  }
  get(t) {
    const r = this.map.get(t);
    if (r !== void 0)
      return this.map.delete(t), this.map.set(t, r), r;
  }
  delete(t) {
    return this.map.delete(t);
  }
  set(t, r) {
    if (!this.delete(t) && r !== void 0) {
      if (this.map.size >= this.max) {
        const s = this.map.keys().next().value;
        this.delete(s);
      }
      this.map.set(t, r);
    }
    return this;
  }
}
var V1 = L1, zs, kc;
function tt() {
  if (kc) return zs;
  kc = 1;
  const e = /\s+/g;
  class t {
    constructor(j, M) {
      if (M = s(M), j instanceof t)
        return j.loose === !!M.loose && j.includePrerelease === !!M.includePrerelease ? j : new t(j.raw, M);
      if (j instanceof a)
        return this.raw = j.value, this.set = [[j]], this.formatted = void 0, this;
      if (this.options = M, this.loose = !!M.loose, this.includePrerelease = !!M.includePrerelease, this.raw = j.trim().replace(e, " "), this.set = this.raw.split("||").map((P) => this.parseRange(P.trim())).filter((P) => P.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const P = this.set[0];
        if (this.set = this.set.filter((p) => !m(p[0])), this.set.length === 0)
          this.set = [P];
        else if (this.set.length > 1) {
          for (const p of this.set)
            if (p.length === 1 && v(p[0])) {
              this.set = [p];
              break;
            }
        }
      }
      this.formatted = void 0;
    }
    get range() {
      if (this.formatted === void 0) {
        this.formatted = "";
        for (let j = 0; j < this.set.length; j++) {
          j > 0 && (this.formatted += "||");
          const M = this.set[j];
          for (let P = 0; P < M.length; P++)
            P > 0 && (this.formatted += " "), this.formatted += M[P].toString().trim();
        }
      }
      return this.formatted;
    }
    format() {
      return this.range;
    }
    toString() {
      return this.range;
    }
    parseRange(j) {
      j = j.replace(y, "");
      const P = ((this.options.includePrerelease && w) | (this.options.loose && _)) + ":" + j, p = n.get(P);
      if (p)
        return p;
      const b = this.options.loose, $ = b ? c[l.HYPHENRANGELOOSE] : c[l.HYPHENRANGE];
      j = j.replace($, oe(this.options.includePrerelease)), o("hyphen replace", j), j = j.replace(c[l.COMPARATORTRIM], h), o("comparator trim", j), j = j.replace(c[l.TILDETRIM], S), o("tilde trim", j), j = j.replace(c[l.CARETTRIM], g), o("caret trim", j);
      let i = j.split(" ").map((I) => R(I, this.options)).join(" ").split(/\s+/).map((I) => K(I, this.options));
      b && (i = i.filter((I) => (o("loose invalid filter", I, this.options), !!I.match(c[l.COMPARATORLOOSE])))), o("range list", i);
      const f = /* @__PURE__ */ new Map(), E = i.map((I) => new a(I, this.options));
      for (const I of E) {
        if (m(I))
          return [I];
        f.set(I.value, I);
      }
      f.size > 1 && f.has("") && f.delete("");
      const T = [...f.values()];
      return n.set(P, T), T;
    }
    intersects(j, M) {
      if (!(j instanceof t))
        throw new TypeError("a Range is required");
      return this.set.some((P) => N(P, M) && j.set.some((p) => N(p, M) && P.every((b) => p.every(($) => b.intersects($, M)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(j) {
      if (!j)
        return !1;
      if (typeof j == "string")
        try {
          j = new u(j, this.options);
        } catch {
          return !1;
        }
      for (let M = 0; M < this.set.length; M++)
        if (Ee(this.set[M], j, this.options))
          return !0;
      return !1;
    }
  }
  zs = t;
  const r = V1, n = new r(), s = di, a = Es(), o = vs, u = Ie, {
    safeRe: c,
    src: d,
    t: l,
    comparatorTrimReplace: h,
    tildeTrimReplace: S,
    caretTrimReplace: g
  } = gn, { FLAG_INCLUDE_PRERELEASE: w, FLAG_LOOSE: _ } = yn, y = new RegExp(d[l.BUILD], "g"), m = (A) => A.value === "<0.0.0-0", v = (A) => A.value === "", N = (A, j) => {
    let M = !0;
    const P = A.slice();
    let p = P.pop();
    for (; M && P.length; )
      M = P.every((b) => p.intersects(b, j)), p = P.pop();
    return M;
  }, R = (A, j) => (A = A.replace(c[l.BUILD], ""), o("comp", A, j), A = de(A, j), o("caret", A), A = B(A, j), o("tildes", A), A = V(A, j), o("xrange", A), A = ne(A, j), o("stars", A), A), O = (A) => !A || A.toLowerCase() === "x" || A === "*", U = (A, j, M) => O(A) && !O(j) || O(j) && M && !O(M), B = (A, j) => A.trim().split(/\s+/).map((M) => le(M, j)).join(" "), le = (A, j) => {
    const M = j.loose ? c[l.TILDELOOSE] : c[l.TILDE], P = j.includePrerelease ? "-0" : "";
    return A.replace(M, (p, b, $, i, f) => {
      o("tilde", A, p, b, $, i, f);
      let E;
      return O(b) ? E = "" : O($) ? E = `>=${b}.0.0${P} <${+b + 1}.0.0-0` : O(i) ? E = `>=${b}.${$}.0${P} <${b}.${+$ + 1}.0-0` : f ? (o("replaceTilde pr", f), E = `>=${b}.${$}.${i}-${f} <${b}.${+$ + 1}.0-0`) : E = `>=${b}.${$}.${i} <${b}.${+$ + 1}.0-0`, o("tilde return", E), E;
    });
  }, de = (A, j) => A.trim().split(/\s+/).map((M) => me(M, j)).join(" "), me = (A, j) => {
    o("caret", A, j);
    const M = j.loose ? c[l.CARETLOOSE] : c[l.CARET], P = j.includePrerelease ? "-0" : "";
    return A.replace(M, (p, b, $, i, f) => {
      o("caret", A, p, b, $, i, f);
      let E;
      return O(b) ? E = "" : O($) ? E = `>=${b}.0.0${P} <${+b + 1}.0.0-0` : O(i) ? b === "0" ? E = `>=${b}.${$}.0${P} <${b}.${+$ + 1}.0-0` : E = `>=${b}.${$}.0${P} <${+b + 1}.0.0-0` : f ? (o("replaceCaret pr", f), b === "0" ? $ === "0" ? E = `>=${b}.${$}.${i}-${f} <${b}.${$}.${+i + 1}-0` : E = `>=${b}.${$}.${i}-${f} <${b}.${+$ + 1}.0-0` : E = `>=${b}.${$}.${i}-${f} <${+b + 1}.0.0-0`) : (o("no pr"), b === "0" ? $ === "0" ? E = `>=${b}.${$}.${i} <${b}.${$}.${+i + 1}-0` : E = `>=${b}.${$}.${i} <${b}.${+$ + 1}.0-0` : E = `>=${b}.${$}.${i} <${+b + 1}.0.0-0`), o("caret return", E), E;
    });
  }, V = (A, j) => (o("replaceXRanges", A, j), A.split(/\s+/).map((M) => q(M, j)).join(" ")), q = (A, j) => {
    A = A.trim();
    const M = j.loose ? c[l.XRANGELOOSE] : c[l.XRANGE];
    return A.replace(M, (P, p, b, $, i, f) => {
      if (o("xRange", A, P, p, b, $, i, f), U(b, $, i))
        return A;
      const E = O(b), T = E || O($), I = T || O(i), D = I;
      return p === "=" && D && (p = ""), f = j.includePrerelease ? "-0" : "", E ? p === ">" || p === "<" ? P = "<0.0.0-0" : P = "*" : p && D ? (T && ($ = 0), i = 0, p === ">" ? (p = ">=", T ? (b = +b + 1, $ = 0, i = 0) : ($ = +$ + 1, i = 0)) : p === "<=" && (p = "<", T ? b = +b + 1 : $ = +$ + 1), p === "<" && (f = "-0"), P = `${p + b}.${$}.${i}${f}`) : T ? P = `>=${b}.0.0${f} <${+b + 1}.0.0-0` : I && (P = `>=${b}.${$}.0${f} <${b}.${+$ + 1}.0-0`), o("xRange return", P), P;
    });
  }, ne = (A, j) => (o("replaceStars", A, j), A.trim().replace(c[l.STAR], "")), K = (A, j) => (o("replaceGTE0", A, j), A.trim().replace(c[j.includePrerelease ? l.GTE0PRE : l.GTE0], "")), oe = (A) => (j, M, P, p, b, $, i, f, E, T, I, D) => (O(P) ? M = "" : O(p) ? M = `>=${P}.0.0${A ? "-0" : ""}` : O(b) ? M = `>=${P}.${p}.0${A ? "-0" : ""}` : $ ? M = `>=${M}` : M = `>=${M}${A ? "-0" : ""}`, O(E) ? f = "" : O(T) ? f = `<${+E + 1}.0.0-0` : O(I) ? f = `<${E}.${+T + 1}.0-0` : D ? f = `<=${E}.${T}.${I}-${D}` : A ? f = `<${E}.${T}.${+I + 1}-0` : f = `<=${f}`, `${M} ${f}`.trim()), Ee = (A, j, M) => {
    for (let P = 0; P < A.length; P++)
      if (!A[P].test(j))
        return !1;
    if (j.prerelease.length && !M.includePrerelease) {
      for (let P = 0; P < A.length; P++)
        if (o(A[P].semver), A[P].semver !== a.ANY && A[P].semver.prerelease.length > 0) {
          const p = A[P].semver;
          if (p.major === j.major && p.minor === j.minor && p.patch === j.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return zs;
}
var Us, Cc;
function Es() {
  if (Cc) return Us;
  Cc = 1;
  const e = Symbol("SemVer ANY");
  class t {
    static get ANY() {
      return e;
    }
    constructor(l, h) {
      if (h = r(h), l instanceof t) {
        if (l.loose === !!h.loose)
          return l;
        l = l.value;
      }
      l = l.trim().split(/\s+/).join(" "), o("comparator", l, h), this.options = h, this.loose = !!h.loose, this.parse(l), this.semver === e ? this.value = "" : this.value = this.operator + this.semver.version, o("comp", this);
    }
    parse(l) {
      const h = this.options.loose ? n[s.COMPARATORLOOSE] : n[s.COMPARATOR], S = l.match(h);
      if (!S)
        throw new TypeError(`Invalid comparator: ${l}`);
      this.operator = S[1] !== void 0 ? S[1] : "", this.operator === "=" && (this.operator = ""), S[2] ? this.semver = new u(S[2], this.options.loose) : this.semver = e;
    }
    toString() {
      return this.value;
    }
    test(l) {
      if (o("Comparator.test", l, this.options.loose), this.semver === e || l === e)
        return !0;
      if (typeof l == "string")
        try {
          l = new u(l, this.options);
        } catch {
          return !1;
        }
      return a(l, this.operator, this.semver, this.options);
    }
    intersects(l, h) {
      if (!(l instanceof t))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new c(l.value, h).test(this.value) : l.operator === "" ? l.value === "" ? !0 : new c(this.value, h).test(l.semver) : (h = r(h), h.includePrerelease && (this.value === "<0.0.0-0" || l.value === "<0.0.0-0") || !h.includePrerelease && (this.value.startsWith("<0.0.0") || l.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && l.operator.startsWith(">") || this.operator.startsWith("<") && l.operator.startsWith("<") || this.semver.version === l.semver.version && this.operator.includes("=") && l.operator.includes("=") || a(this.semver, "<", l.semver, h) && this.operator.startsWith(">") && l.operator.startsWith("<") || a(this.semver, ">", l.semver, h) && this.operator.startsWith("<") && l.operator.startsWith(">")));
    }
  }
  Us = t;
  const r = di, { safeRe: n, t: s } = gn, a = rd, o = vs, u = Ie, c = tt();
  return Us;
}
const F1 = tt(), z1 = (e, t, r) => {
  try {
    t = new F1(t, r);
  } catch {
    return !1;
  }
  return t.test(e);
};
var bs = z1;
const U1 = tt(), q1 = (e, t) => new U1(e, t).set.map((r) => r.map((n) => n.value).join(" ").trim().split(" "));
var K1 = q1;
const G1 = Ie, H1 = tt(), B1 = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new H1(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === -1) && (n = o, s = new G1(n, r));
  }), n;
};
var X1 = B1;
const J1 = Ie, W1 = tt(), Y1 = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new W1(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === 1) && (n = o, s = new J1(n, r));
  }), n;
};
var Q1 = Y1;
const qs = Ie, Z1 = tt(), Dc = ws, x1 = (e, t) => {
  e = new Z1(e, t);
  let r = new qs("0.0.0");
  if (e.test(r) || (r = new qs("0.0.0-0"), e.test(r)))
    return r;
  r = null;
  for (let n = 0; n < e.set.length; ++n) {
    const s = e.set[n];
    let a = null;
    s.forEach((o) => {
      const u = new qs(o.semver.version);
      switch (o.operator) {
        case ">":
          u.prerelease.length === 0 ? u.patch++ : u.prerelease.push(0), u.raw = u.format();
        case "":
        case ">=":
          (!a || Dc(u, a)) && (a = u);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${o.operator}`);
      }
    }), a && (!r || Dc(r, a)) && (r = a);
  }
  return r && e.test(r) ? r : null;
};
var eb = x1;
const tb = tt(), rb = (e, t) => {
  try {
    return new tb(e, t).range || "*";
  } catch {
    return null;
  }
};
var nb = rb;
const sb = Ie, nd = Es(), { ANY: ab } = nd, ob = tt(), ib = bs, Mc = ws, Lc = hi, cb = pi, lb = mi, ub = (e, t, r, n) => {
  e = new sb(e, n), t = new ob(t, n);
  let s, a, o, u, c;
  switch (r) {
    case ">":
      s = Mc, a = cb, o = Lc, u = ">", c = ">=";
      break;
    case "<":
      s = Lc, a = lb, o = Mc, u = "<", c = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (ib(e, t, n))
    return !1;
  for (let d = 0; d < t.set.length; ++d) {
    const l = t.set[d];
    let h = null, S = null;
    if (l.forEach((g) => {
      g.semver === ab && (g = new nd(">=0.0.0")), h = h || g, S = S || g, s(g.semver, h.semver, n) ? h = g : o(g.semver, S.semver, n) && (S = g);
    }), h.operator === u || h.operator === c || (!S.operator || S.operator === u) && a(e, S.semver))
      return !1;
    if (S.operator === c && o(e, S.semver))
      return !1;
  }
  return !0;
};
var $i = ub;
const db = $i, fb = (e, t, r) => db(e, t, ">", r);
var hb = fb;
const mb = $i, pb = (e, t, r) => mb(e, t, "<", r);
var $b = pb;
const Vc = tt(), yb = (e, t, r) => (e = new Vc(e, r), t = new Vc(t, r), e.intersects(t, r));
var gb = yb;
const _b = bs, vb = et;
var wb = (e, t, r) => {
  const n = [];
  let s = null, a = null;
  const o = e.sort((l, h) => vb(l, h, r));
  for (const l of o)
    _b(l, t, r) ? (a = l, s || (s = l)) : (a && n.push([s, a]), a = null, s = null);
  s && n.push([s, null]);
  const u = [];
  for (const [l, h] of n)
    l === h ? u.push(l) : !h && l === o[0] ? u.push("*") : h ? l === o[0] ? u.push(`<=${h}`) : u.push(`${l} - ${h}`) : u.push(`>=${l}`);
  const c = u.join(" || "), d = typeof t.raw == "string" ? t.raw : String(t);
  return c.length < d.length ? c : t;
};
const Fc = tt(), yi = Es(), { ANY: Ks } = yi, Gs = bs, gi = et, Eb = (e, t, r = {}) => {
  if (e === t)
    return !0;
  e = new Fc(e, r), t = new Fc(t, r);
  let n = !1;
  e: for (const s of e.set) {
    for (const a of t.set) {
      const o = Sb(s, a, r);
      if (n = n || o !== null, o)
        continue e;
    }
    if (n)
      return !1;
  }
  return !0;
}, bb = [new yi(">=0.0.0-0")], zc = [new yi(">=0.0.0")], Sb = (e, t, r) => {
  if (e === t)
    return !0;
  if (e.length === 1 && e[0].semver === Ks) {
    if (t.length === 1 && t[0].semver === Ks)
      return !0;
    r.includePrerelease ? e = bb : e = zc;
  }
  if (t.length === 1 && t[0].semver === Ks) {
    if (r.includePrerelease)
      return !0;
    t = zc;
  }
  const n = /* @__PURE__ */ new Set();
  let s, a;
  for (const g of e)
    g.operator === ">" || g.operator === ">=" ? s = Uc(s, g, r) : g.operator === "<" || g.operator === "<=" ? a = qc(a, g, r) : n.add(g.semver);
  if (n.size > 1)
    return null;
  let o;
  if (s && a) {
    if (o = gi(s.semver, a.semver, r), o > 0)
      return null;
    if (o === 0 && (s.operator !== ">=" || a.operator !== "<="))
      return null;
  }
  for (const g of n) {
    if (s && !Gs(g, String(s), r) || a && !Gs(g, String(a), r))
      return null;
    for (const w of t)
      if (!Gs(g, String(w), r))
        return !1;
    return !0;
  }
  let u, c, d, l, h = a && !r.includePrerelease && a.semver.prerelease.length ? a.semver : !1, S = s && !r.includePrerelease && s.semver.prerelease.length ? s.semver : !1;
  h && h.prerelease.length === 1 && a.operator === "<" && h.prerelease[0] === 0 && (h = !1);
  for (const g of t) {
    if (l = l || g.operator === ">" || g.operator === ">=", d = d || g.operator === "<" || g.operator === "<=", s) {
      if (S && g.semver.prerelease && g.semver.prerelease.length && g.semver.major === S.major && g.semver.minor === S.minor && g.semver.patch === S.patch && (S = !1), g.operator === ">" || g.operator === ">=") {
        if (u = Uc(s, g, r), u === g && u !== s)
          return !1;
      } else if (s.operator === ">=" && !g.test(s.semver))
        return !1;
    }
    if (a) {
      if (h && g.semver.prerelease && g.semver.prerelease.length && g.semver.major === h.major && g.semver.minor === h.minor && g.semver.patch === h.patch && (h = !1), g.operator === "<" || g.operator === "<=") {
        if (c = qc(a, g, r), c === g && c !== a)
          return !1;
      } else if (a.operator === "<=" && !g.test(a.semver))
        return !1;
    }
    if (!g.operator && (a || s) && o !== 0)
      return !1;
  }
  return !(s && d && !a && o !== 0 || a && l && !s && o !== 0 || S || h);
}, Uc = (e, t, r) => {
  if (!e)
    return t;
  const n = gi(e.semver, t.semver, r);
  return n > 0 ? e : n < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
}, qc = (e, t, r) => {
  if (!e)
    return t;
  const n = gi(e.semver, t.semver, r);
  return n < 0 ? e : n > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
};
var Pb = Eb;
const Hs = gn, Kc = yn, Nb = Ie, Gc = xu, Rb = dr, Ob = NE, Ib = IE, Tb = jE, jb = kE, Ab = ME, kb = FE, Cb = qE, Db = HE, Mb = et, Lb = WE, Vb = ZE, Fb = fi, zb = r1, Ub = a1, qb = ws, Kb = hi, Gb = ed, Hb = td, Bb = mi, Xb = pi, Jb = rd, Wb = O1, Yb = M1, Qb = Es(), Zb = tt(), xb = bs, eS = K1, tS = X1, rS = Q1, nS = eb, sS = nb, aS = $i, oS = hb, iS = $b, cS = gb, lS = wb, uS = Pb;
var dS = {
  parse: Rb,
  valid: Ob,
  clean: Ib,
  inc: Tb,
  diff: jb,
  major: Ab,
  minor: kb,
  patch: Cb,
  prerelease: Db,
  compare: Mb,
  rcompare: Lb,
  compareLoose: Vb,
  compareBuild: Fb,
  sort: zb,
  rsort: Ub,
  gt: qb,
  lt: Kb,
  eq: Gb,
  neq: Hb,
  gte: Bb,
  lte: Xb,
  cmp: Jb,
  coerce: Wb,
  truncate: Yb,
  Comparator: Qb,
  Range: Zb,
  satisfies: xb,
  toComparators: eS,
  maxSatisfying: tS,
  minSatisfying: rS,
  minVersion: nS,
  validRange: sS,
  outside: aS,
  gtr: oS,
  ltr: iS,
  intersects: cS,
  simplifyRange: lS,
  subset: uS,
  SemVer: Nb,
  re: Hs.re,
  src: Hs.src,
  tokens: Hs.t,
  SEMVER_SPEC_VERSION: Kc.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: Kc.RELEASE_TYPES,
  compareIdentifiers: Gc.compareIdentifiers,
  rcompareIdentifiers: Gc.rcompareIdentifiers
};
const $r = /* @__PURE__ */ sl(dS), fS = Object.prototype.toString, hS = "[object Uint8Array]", mS = "[object ArrayBuffer]";
function sd(e, t, r) {
  return e ? e.constructor === t ? !0 : fS.call(e) === r : !1;
}
function ad(e) {
  return sd(e, Uint8Array, hS);
}
function pS(e) {
  return sd(e, ArrayBuffer, mS);
}
function $S(e) {
  return ad(e) || pS(e);
}
function yS(e) {
  if (!ad(e))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof e}\``);
}
function gS(e) {
  if (!$S(e))
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
}
function Bs(e, t) {
  if (e.length === 0)
    return new Uint8Array(0);
  t ?? (t = e.reduce((s, a) => s + a.length, 0));
  const r = new Uint8Array(t);
  let n = 0;
  for (const s of e)
    yS(s), r.set(s, n), n += s.length;
  return r;
}
const Vn = {
  utf8: new globalThis.TextDecoder("utf8")
};
function Fn(e, t = "utf8") {
  return gS(e), Vn[t] ?? (Vn[t] = new globalThis.TextDecoder(t)), Vn[t].decode(e);
}
function _S(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected \`string\`, got \`${typeof e}\``);
}
const vS = new globalThis.TextEncoder();
function Xs(e) {
  return _S(e), vS.encode(e);
}
Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
const Hc = "aes-256-cbc", od = /* @__PURE__ */ new Set([
  "aes-256-cbc",
  "aes-256-gcm",
  "aes-256-ctr"
]), wS = (e) => typeof e == "string" && od.has(e), dt = () => /* @__PURE__ */ Object.create(null), Bc = (e) => e !== void 0, Js = (e, t) => {
  const r = /* @__PURE__ */ new Set([
    "undefined",
    "symbol",
    "function"
  ]), n = typeof t;
  if (r.has(n))
    throw new TypeError(`Setting a value of type \`${n}\` for key \`${e}\` is not allowed as it's not supported by JSON`);
}, Pt = "__internal__", Ws = `${Pt}.migrations.version`;
var Ot, It, nr, Ce, Ue, sr, ar, Rr, nt, ye, id, cd, ld, ud, dd, fd, hd, md;
class ES {
  constructor(t = {}) {
    He(this, ye);
    Kr(this, "path");
    Kr(this, "events");
    He(this, Ot);
    He(this, It);
    He(this, nr);
    He(this, Ce);
    He(this, Ue, {});
    He(this, sr, !1);
    He(this, ar);
    He(this, Rr);
    He(this, nt);
    Kr(this, "_deserialize", (t) => JSON.parse(t));
    Kr(this, "_serialize", (t) => JSON.stringify(t, void 0, "	"));
    const r = lt(this, ye, id).call(this, t);
    ke(this, Ce, r), lt(this, ye, cd).call(this, r), lt(this, ye, ud).call(this, r), lt(this, ye, dd).call(this, r), this.events = new EventTarget(), ke(this, It, r.encryptionKey), ke(this, nr, r.encryptionAlgorithm ?? Hc), this.path = lt(this, ye, fd).call(this, r), lt(this, ye, hd).call(this, r), r.watch && this._watch();
  }
  get(t, r) {
    if (X(this, Ce).accessPropertiesByDotNotation)
      return this._get(t, r);
    const { store: n } = this;
    return t in n ? n[t] : r;
  }
  set(t, r) {
    if (typeof t != "string" && typeof t != "object")
      throw new TypeError(`Expected \`key\` to be of type \`string\` or \`object\`, got ${typeof t}`);
    if (typeof t != "object" && r === void 0)
      throw new TypeError("Use `delete()` to clear values");
    if (this._containsReservedKey(t))
      throw new TypeError(`Please don't use the ${Pt} key, as it's used to manage this module internal operations.`);
    const { store: n } = this, s = (a, o) => {
      if (Js(a, o), X(this, Ce).accessPropertiesByDotNotation)
        _n(n, a, o);
      else {
        if (a === "__proto__" || a === "constructor" || a === "prototype")
          return;
        n[a] = o;
      }
    };
    if (typeof t == "object") {
      const a = t;
      for (const [o, u] of Object.entries(a))
        s(o, u);
    } else
      s(t, r);
    this.store = n;
  }
  has(t) {
    return X(this, Ce).accessPropertiesByDotNotation ? Rs(this.store, t) : t in this.store;
  }
  appendToArray(t, r) {
    Js(t, r);
    const n = X(this, Ce).accessPropertiesByDotNotation ? this._get(t, []) : t in this.store ? this.store[t] : [];
    if (!Array.isArray(n))
      throw new TypeError(`The key \`${t}\` is already set to a non-array value`);
    this.set(t, [...n, r]);
  }
  /**
      Reset items to their default values, as defined by the `defaults` or `schema` option.
  
      @see `clear()` to reset all items.
  
      @param keys - The keys of the items to reset.
      */
  reset(...t) {
    for (const r of t)
      Bc(X(this, Ue)[r]) && this.set(r, X(this, Ue)[r]);
  }
  delete(t) {
    const { store: r } = this;
    X(this, Ce).accessPropertiesByDotNotation ? bd(r, t) : delete r[t], this.store = r;
  }
  /**
      Delete all items.
  
      This resets known items to their default values, if defined by the `defaults` or `schema` option.
      */
  clear() {
    const t = dt();
    for (const r of Object.keys(X(this, Ue)))
      Bc(X(this, Ue)[r]) && (Js(r, X(this, Ue)[r]), X(this, Ce).accessPropertiesByDotNotation ? _n(t, r, X(this, Ue)[r]) : t[r] = X(this, Ue)[r]);
    this.store = t;
  }
  onDidChange(t, r) {
    if (typeof t != "string")
      throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof t}`);
    if (typeof r != "function")
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof r}`);
    return this._handleValueChange(() => this.get(t), r);
  }
  /**
      Watches the whole config object, calling `callback` on any changes.
  
      @param callback - A callback function that is called on any changes. When a `key` is first set `oldValue` will be `undefined`, and when a key is deleted `newValue` will be `undefined`.
      @returns A function, that when called, will unsubscribe.
      */
  onDidAnyChange(t) {
    if (typeof t != "function")
      throw new TypeError(`Expected \`callback\` to be of type \`function\`, got ${typeof t}`);
    return this._handleStoreChange(t);
  }
  get size() {
    return Object.keys(this.store).filter((r) => !this._isReservedKeyPath(r)).length;
  }
  /**
      Get all the config as an object or replace the current config with an object.
  
      @example
      ```
      console.log(config.store);
      //=> {name: 'John', age: 30}
      ```
  
      @example
      ```
      config.store = {
          hello: 'world'
      };
      ```
      */
  get store() {
    var t;
    try {
      const r = J.readFileSync(this.path, X(this, It) ? null : "utf8"), n = this._decryptData(r);
      return ((a) => {
        const o = this._deserialize(a);
        return X(this, sr) || this._validate(o), Object.assign(dt(), o);
      })(n);
    } catch (r) {
      if ((r == null ? void 0 : r.code) === "ENOENT")
        return this._ensureDirectory(), dt();
      if (X(this, Ce).clearInvalidConfig) {
        const n = r;
        if (n.name === "SyntaxError" || (t = n.message) != null && t.startsWith("Config schema violation:") || n.message === "Failed to decrypt config data.")
          return dt();
      }
      throw r;
    }
  }
  set store(t) {
    if (this._ensureDirectory(), !Rs(t, Pt))
      try {
        const r = J.readFileSync(this.path, X(this, It) ? null : "utf8"), n = this._decryptData(r), s = this._deserialize(n);
        Rs(s, Pt) && _n(t, Pt, Ei(s, Pt));
      } catch {
      }
    X(this, sr) || this._validate(t), this._write(t), this.events.dispatchEvent(new Event("change"));
  }
  *[Symbol.iterator]() {
    for (const [t, r] of Object.entries(this.store))
      this._isReservedKeyPath(t) || (yield [t, r]);
  }
  /**
  Close the file watcher if one exists. This is useful in tests to prevent the process from hanging.
  */
  _closeWatcher() {
    X(this, ar) && (X(this, ar).close(), ke(this, ar, void 0)), X(this, Rr) && (J.unwatchFile(this.path), ke(this, Rr, !1)), ke(this, nt, void 0);
  }
  _decryptData(t) {
    const r = X(this, It);
    if (!r)
      return typeof t == "string" ? t : Fn(t);
    const n = X(this, nr), s = n === "aes-256-gcm" ? 16 : 0, a = ":".codePointAt(0), o = typeof t == "string" ? t.codePointAt(16) : t[16];
    if (!(a !== void 0 && o === a)) {
      if (n === "aes-256-cbc")
        return typeof t == "string" ? t : Fn(t);
      throw new Error("Failed to decrypt config data.");
    }
    const c = (g) => {
      if (s === 0)
        return { ciphertext: g };
      const w = g.length - s;
      if (w < 0)
        throw new Error("Invalid authentication tag length.");
      return {
        ciphertext: g.slice(0, w),
        authenticationTag: g.slice(w)
      };
    }, d = t.slice(0, 16), l = t.slice(17), h = typeof l == "string" ? Xs(l) : l, S = (g) => {
      const { ciphertext: w, authenticationTag: _ } = c(h), y = Gr.pbkdf2Sync(r, g, 1e4, 32, "sha512"), m = Gr.createDecipheriv(n, y, d);
      return _ && m.setAuthTag(_), Fn(Bs([m.update(w), m.final()]));
    };
    try {
      return S(d);
    } catch {
      try {
        return S(d.toString());
      } catch {
      }
    }
    if (n === "aes-256-cbc")
      return typeof t == "string" ? t : Fn(t);
    throw new Error("Failed to decrypt config data.");
  }
  _handleStoreChange(t) {
    let r = this.store;
    const n = () => {
      const s = r, a = this.store;
      vi(a, s) || (r = a, t.call(this, a, s));
    };
    return this.events.addEventListener("change", n), () => {
      this.events.removeEventListener("change", n);
    };
  }
  _handleValueChange(t, r) {
    let n = t();
    const s = () => {
      const a = n, o = t();
      vi(o, a) || (n = o, r.call(this, o, a));
    };
    return this.events.addEventListener("change", s), () => {
      this.events.removeEventListener("change", s);
    };
  }
  _validate(t) {
    if (!X(this, Ot) || X(this, Ot).call(this, t) || !X(this, Ot).errors)
      return;
    const n = X(this, Ot).errors.map(({ instancePath: s, message: a = "" }) => `\`${s.slice(1)}\` ${a}`);
    throw new Error("Config schema violation: " + n.join("; "));
  }
  _ensureDirectory() {
    J.mkdirSync(x.dirname(this.path), { recursive: !0 });
  }
  _write(t) {
    let r = this._serialize(t);
    const n = X(this, It);
    if (n) {
      const s = Gr.randomBytes(16), a = Gr.pbkdf2Sync(n, s, 1e4, 32, "sha512"), o = Gr.createCipheriv(X(this, nr), a, s), u = Bs([o.update(Xs(r)), o.final()]), c = [s, Xs(":"), u];
      X(this, nr) === "aes-256-gcm" && c.push(o.getAuthTag()), r = Bs(c);
    }
    if (ue.env.SNAP)
      J.writeFileSync(this.path, r, { mode: X(this, Ce).configFileMode });
    else
      try {
        nl(this.path, r, { mode: X(this, Ce).configFileMode });
      } catch (s) {
        if ((s == null ? void 0 : s.code) === "EXDEV") {
          J.writeFileSync(this.path, r, { mode: X(this, Ce).configFileMode });
          return;
        }
        throw s;
      }
  }
  _watch() {
    if (this._ensureDirectory(), J.existsSync(this.path) || this._write(dt()), ue.platform === "win32" || ue.platform === "darwin") {
      X(this, nt) ?? ke(this, nt, Pc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 100 }));
      const t = x.dirname(this.path), r = x.basename(this.path);
      ke(this, ar, J.watch(t, { persistent: !1, encoding: "utf8" }, (n, s) => {
        s && s !== r || typeof X(this, nt) == "function" && X(this, nt).call(this);
      }));
    } else
      X(this, nt) ?? ke(this, nt, Pc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 1e3 })), J.watchFile(this.path, { persistent: !1 }, (t, r) => {
        typeof X(this, nt) == "function" && X(this, nt).call(this);
      }), ke(this, Rr, !0);
  }
  _migrate(t, r, n) {
    let s = this._get(Ws, "0.0.0");
    const a = Object.keys(t).filter((u) => this._shouldPerformMigration(u, s, r));
    let o = structuredClone(this.store);
    for (const u of a)
      try {
        n && n(this, {
          fromVersion: s,
          toVersion: u,
          finalVersion: r,
          versions: a
        });
        const c = t[u];
        c == null || c(this), this._set(Ws, u), s = u, o = structuredClone(this.store);
      } catch (c) {
        this.store = o;
        const d = c instanceof Error ? c.message : String(c);
        throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${d}`);
      }
    (this._isVersionInRangeFormat(s) || !$r.eq(s, r)) && this._set(Ws, r);
  }
  _containsReservedKey(t) {
    return typeof t == "string" ? this._isReservedKeyPath(t) : !t || typeof t != "object" ? !1 : this._objectContainsReservedKey(t);
  }
  _objectContainsReservedKey(t) {
    if (!t || typeof t != "object")
      return !1;
    for (const [r, n] of Object.entries(t))
      if (this._isReservedKeyPath(r) || this._objectContainsReservedKey(n))
        return !0;
    return !1;
  }
  _isReservedKeyPath(t) {
    return t === Pt || t.startsWith(`${Pt}.`);
  }
  _isVersionInRangeFormat(t) {
    return $r.clean(t) === null;
  }
  _shouldPerformMigration(t, r, n) {
    return this._isVersionInRangeFormat(t) ? r !== "0.0.0" && $r.satisfies(r, t) ? !1 : $r.satisfies(n, t) : !($r.lte(t, r) || $r.gt(t, n));
  }
  _get(t, r) {
    return Ei(this.store, t, r);
  }
  _set(t, r) {
    const { store: n } = this;
    _n(n, t, r), this.store = n;
  }
}
Ot = new WeakMap(), It = new WeakMap(), nr = new WeakMap(), Ce = new WeakMap(), Ue = new WeakMap(), sr = new WeakMap(), ar = new WeakMap(), Rr = new WeakMap(), nt = new WeakMap(), ye = new WeakSet(), id = function(t) {
  const r = {
    configName: "config",
    fileExtension: "json",
    projectSuffix: "nodejs",
    clearInvalidConfig: !1,
    accessPropertiesByDotNotation: !0,
    configFileMode: 438,
    ...t
  };
  if (r.encryptionAlgorithm ?? (r.encryptionAlgorithm = Hc), !wS(r.encryptionAlgorithm))
    throw new TypeError(`The \`encryptionAlgorithm\` option must be one of: ${[...od].join(", ")}`);
  if (!r.cwd) {
    if (!r.projectName)
      throw new Error("Please specify the `projectName` option.");
    r.cwd = Rd(r.projectName, { suffix: r.projectSuffix }).config;
  }
  return typeof r.fileExtension == "string" && (r.fileExtension = r.fileExtension.replace(/^\.+/, "")), r;
}, cd = function(t) {
  if (!(t.schema ?? t.ajvOptions ?? t.rootSchema))
    return;
  if (t.schema && typeof t.schema != "object")
    throw new TypeError("The `schema` option must be an object.");
  const r = tE.default, n = new q0.Ajv2020({
    allErrors: !0,
    useDefaults: !0,
    ...t.ajvOptions
  });
  r(n);
  const s = {
    ...t.rootSchema,
    type: "object",
    properties: t.schema
  };
  ke(this, Ot, n.compile(s)), lt(this, ye, ld).call(this, t.schema);
}, ld = function(t) {
  const r = Object.entries(t ?? {});
  for (const [n, s] of r) {
    if (!s || typeof s != "object" || !Object.hasOwn(s, "default"))
      continue;
    const { default: a } = s;
    a !== void 0 && (X(this, Ue)[n] = a);
  }
}, ud = function(t) {
  t.defaults && Object.assign(X(this, Ue), t.defaults);
}, dd = function(t) {
  t.serialize && (this._serialize = t.serialize), t.deserialize && (this._deserialize = t.deserialize);
}, fd = function(t) {
  const r = typeof t.fileExtension == "string" ? t.fileExtension : void 0, n = r ? `.${r}` : "";
  return x.resolve(t.cwd, `${t.configName ?? "config"}${n}`);
}, hd = function(t) {
  if (t.migrations) {
    lt(this, ye, md).call(this, t), this._validate(this.store);
    return;
  }
  const r = this.store, n = Object.assign(dt(), t.defaults ?? {}, r);
  this._validate(n);
  try {
    wi.deepEqual(r, n);
  } catch {
    this.store = n;
  }
}, md = function(t) {
  const { migrations: r, projectVersion: n } = t;
  if (r) {
    if (!n)
      throw new Error("Please specify the `projectVersion` option.");
    ke(this, sr, !0);
    try {
      const s = this.store, a = Object.assign(dt(), t.defaults ?? {}, s);
      try {
        wi.deepEqual(s, a);
      } catch {
        this._write(a);
      }
      this._migrate(r, n, t.beforeEachMigration);
    } finally {
      ke(this, sr, !1);
    }
  }
};
const { app: Wn, ipcMain: pa, shell: bS } = Wc;
let Xc = !1;
const Jc = () => {
  if (!pa || !Wn)
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  const e = {
    defaultCwd: Wn.getPath("userData"),
    appVersion: Wn.getVersion()
  };
  return Xc || (pa.on("electron-store-get-data", (t) => {
    t.returnValue = e;
  }), Xc = !0), e;
};
class SS extends ES {
  constructor(t) {
    let r, n;
    if (ue.type === "renderer") {
      const s = Wc.ipcRenderer.sendSync("electron-store-get-data");
      if (!s)
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      ({ defaultCwd: r, appVersion: n } = s);
    } else pa && Wn && ({ defaultCwd: r, appVersion: n } = Jc());
    t = {
      name: "config",
      ...t
    }, t.projectVersion || (t.projectVersion = n), t.cwd ? t.cwd = x.isAbsolute(t.cwd) ? t.cwd : x.join(r, t.cwd) : t.cwd = r, t.configName = t.name, delete t.name, super(t);
  }
  static initRenderer() {
    Jc();
  }
  async openInEditor() {
    const t = await bS.openPath(this.path);
    if (t)
      throw new Error(t);
  }
}
const Zr = new SS(), pd = x.dirname(vd(import.meta.url));
process.env.APP_ROOT = x.join(pd, "..");
const $a = process.env.VITE_DEV_SERVER_URL, zS = x.join(process.env.APP_ROOT, "dist-electron"), $d = x.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = $a ? x.join(process.env.APP_ROOT, "public") : $d;
let Nt;
Yc.handle("preferences:get", () => Zr.store);
Yc.handle(
  "preferences:set",
  (e, t) => (typeof t.locale == "string" && Zr.set("locale", t.locale), typeof t.nickname == "string" && Zr.set("nickname", t.nickname), typeof t.category == "string" && Zr.set("category", t.category), Zr.store)
);
function yd() {
  Nt = new Qc({
    icon: x.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: x.join(pd, "preload.mjs")
    }
  }), Nt.webContents.on("did-finish-load", () => {
    Nt == null || Nt.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), $a ? Nt.loadURL($a) : Nt.loadFile(x.join($d, "index.html"));
}
Yn.on("window-all-closed", () => {
  process.platform !== "darwin" && (Yn.quit(), Nt = null);
});
Yn.on("activate", () => {
  Qc.getAllWindows().length === 0 && yd();
});
Yn.whenReady().then(yd);
export {
  zS as MAIN_DIST,
  $d as RENDERER_DIST,
  $a as VITE_DEV_SERVER_URL
};
