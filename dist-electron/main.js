var Xu = Object.defineProperty;
var ci = (e) => {
  throw TypeError(e);
};
var Ju = (e, t, r) => t in e ? Xu(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var Dr = (e, t, r) => Ju(e, typeof t != "symbol" ? t + "" : t, r), ys = (e, t, r) => t.has(e) || ci("Cannot " + r);
var Z = (e, t, r) => (ys(e, t, "read from private field"), r ? r.call(e) : t.get(e)), Ye = (e, t, r) => t.has(e) ? ci("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), ze = (e, t, r, n) => (ys(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), pt = (e, t, r) => (ys(e, t, "access private method"), r);
import Fc, { ipcMain as ia, app as qn, BrowserWindow as zc } from "electron";
import { fileURLToPath as Wu } from "node:url";
import se from "node:path";
import me from "node:process";
import { promisify as je, isDeepStrictEqual as li } from "node:util";
import x from "node:fs";
import Mr from "node:crypto";
import ui from "node:assert";
import Uc from "node:os";
import "node:events";
import "node:stream";
const tr = (e) => {
  const t = typeof e;
  return e !== null && (t === "object" || t === "function");
}, qc = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]), Kc = 1e6, Yu = (e) => e >= "0" && e <= "9";
function Gc(e) {
  if (e === "0")
    return !0;
  if (/^[1-9]\d*$/.test(e)) {
    const t = Number.parseInt(e, 10);
    return t <= Number.MAX_SAFE_INTEGER && t <= Kc;
  }
  return !1;
}
function gs(e, t) {
  return qc.has(e) ? !1 : (e && Gc(e) ? t.push(Number.parseInt(e, 10)) : t.push(e), !0);
}
function Qu(e) {
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
        if (!gs(r, t))
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
          if ((r || n === "property") && !gs(r, t))
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
            const l = Number.parseInt(r, 10);
            !Number.isNaN(l) && Number.isFinite(l) && l >= 0 && l <= Number.MAX_SAFE_INTEGER && l <= Kc && r === String(l) ? t.push(l) : t.push(r), r = "", n = "indexEnd";
          }
          break;
        }
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        r += o;
        break;
      }
      default: {
        if (n === "index" && !Yu(o))
          throw new Error(`Invalid character '${o}' in an index at position ${a}`);
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        n === "start" && (n = "property"), r += o;
      }
    }
  }
  switch (s && (r += "\\"), n) {
    case "property": {
      if (!gs(r, t))
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
function Qn(e) {
  if (typeof e == "string")
    return Qu(e);
  if (Array.isArray(e)) {
    const t = [];
    for (const [r, n] of e.entries()) {
      if (typeof n != "string" && typeof n != "number")
        throw new TypeError(`Expected a string or number for path segment at index ${r}, got ${typeof n}`);
      if (typeof n == "number" && !Number.isFinite(n))
        throw new TypeError(`Path segment at index ${r} must be a finite number, got ${n}`);
      if (qc.has(n))
        return [];
      typeof n == "string" && Gc(n) ? t.push(Number.parseInt(n, 10)) : t.push(n);
    }
    return t;
  }
  return [];
}
function di(e, t, r) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return r === void 0 ? e : r;
  const n = Qn(t);
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
function ln(e, t, r) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return e;
  const n = e, s = Qn(t);
  if (s.length === 0)
    return e;
  for (let a = 0; a < s.length; a++) {
    const o = s[a];
    if (a === s.length - 1)
      e[o] = r;
    else if (!tr(e[o])) {
      const c = typeof s[a + 1] == "number";
      e[o] = c ? [] : {};
    }
    e = e[o];
  }
  return n;
}
function Zu(e, t) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = Qn(t);
  if (r.length === 0)
    return !1;
  for (let n = 0; n < r.length; n++) {
    const s = r[n];
    if (n === r.length - 1)
      return Object.hasOwn(e, s) ? (delete e[s], !0) : !1;
    if (e = e[s], !tr(e))
      return !1;
  }
}
function _s(e, t) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = Qn(t);
  if (r.length === 0)
    return !1;
  for (const n of r) {
    if (!tr(e) || !(n in e))
      return !1;
    e = e[n];
  }
  return !0;
}
const Ct = Uc.homedir(), ca = Uc.tmpdir(), { env: hr } = me, xu = (e) => {
  const t = se.join(Ct, "Library");
  return {
    data: se.join(t, "Application Support", e),
    config: se.join(t, "Preferences", e),
    cache: se.join(t, "Caches", e),
    log: se.join(t, "Logs", e),
    temp: se.join(ca, e)
  };
}, ed = (e) => {
  const t = hr.APPDATA || se.join(Ct, "AppData", "Roaming"), r = hr.LOCALAPPDATA || se.join(Ct, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: se.join(r, e, "Data"),
    config: se.join(t, e, "Config"),
    cache: se.join(r, e, "Cache"),
    log: se.join(r, e, "Log"),
    temp: se.join(ca, e)
  };
}, td = (e) => {
  const t = se.basename(Ct);
  return {
    data: se.join(hr.XDG_DATA_HOME || se.join(Ct, ".local", "share"), e),
    config: se.join(hr.XDG_CONFIG_HOME || se.join(Ct, ".config"), e),
    cache: se.join(hr.XDG_CACHE_HOME || se.join(Ct, ".cache"), e),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: se.join(hr.XDG_STATE_HOME || se.join(Ct, ".local", "state"), e),
    temp: se.join(ca, t, e)
  };
};
function rd(e, { suffix: t = "nodejs" } = {}) {
  if (typeof e != "string")
    throw new TypeError(`Expected a string, got ${typeof e}`);
  return t && (e += `-${t}`), me.platform === "darwin" ? xu(e) : me.platform === "win32" ? ed(e) : td(e);
}
const St = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    return e.apply(void 0, s).catch(r);
  };
}, $t = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    try {
      return e.apply(void 0, s);
    } catch (a) {
      return r(a);
    }
  };
}, nd = 250, Pt = (e, t) => {
  const { isRetriable: r } = t;
  return function(s) {
    const { timeout: a } = s, o = s.interval ?? nd, l = Date.now() + a;
    return function c(...d) {
      return e.apply(void 0, d).catch((u) => {
        if (!r(u) || Date.now() >= l)
          throw u;
        const h = Math.round(o * Math.random());
        return h > 0 ? new Promise((y) => setTimeout(y, h)).then(() => c.apply(void 0, d)) : c.apply(void 0, d);
      });
    };
  };
}, Nt = (e, t) => {
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
}, mr = {
  /* API */
  isChangeErrorOk: (e) => {
    if (!mr.isNodeError(e))
      return !1;
    const { code: t } = e;
    return t === "ENOSYS" || !sd && (t === "EINVAL" || t === "EPERM");
  },
  isNodeError: (e) => e instanceof Error,
  isRetriableError: (e) => {
    if (!mr.isNodeError(e))
      return !1;
    const { code: t } = e;
    return t === "EMFILE" || t === "ENFILE" || t === "EAGAIN" || t === "EBUSY" || t === "EACCESS" || t === "EACCES" || t === "EACCS" || t === "EPERM";
  },
  onChangeError: (e) => {
    if (!mr.isNodeError(e))
      throw e;
    if (!mr.isChangeErrorOk(e))
      throw e;
  }
}, un = {
  onError: mr.onChangeError
}, He = {
  onError: () => {
  }
}, sd = me.getuid ? !me.getuid() : !1, Ae = {
  isRetriable: mr.isRetriableError
}, Ce = {
  attempt: {
    /* ASYNC */
    chmod: St(je(x.chmod), un),
    chown: St(je(x.chown), un),
    close: St(je(x.close), He),
    fsync: St(je(x.fsync), He),
    mkdir: St(je(x.mkdir), He),
    realpath: St(je(x.realpath), He),
    stat: St(je(x.stat), He),
    unlink: St(je(x.unlink), He),
    /* SYNC */
    chmodSync: $t(x.chmodSync, un),
    chownSync: $t(x.chownSync, un),
    closeSync: $t(x.closeSync, He),
    existsSync: $t(x.existsSync, He),
    fsyncSync: $t(x.fsync, He),
    mkdirSync: $t(x.mkdirSync, He),
    realpathSync: $t(x.realpathSync, He),
    statSync: $t(x.statSync, He),
    unlinkSync: $t(x.unlinkSync, He)
  },
  retry: {
    /* ASYNC */
    close: Pt(je(x.close), Ae),
    fsync: Pt(je(x.fsync), Ae),
    open: Pt(je(x.open), Ae),
    readFile: Pt(je(x.readFile), Ae),
    rename: Pt(je(x.rename), Ae),
    stat: Pt(je(x.stat), Ae),
    write: Pt(je(x.write), Ae),
    writeFile: Pt(je(x.writeFile), Ae),
    /* SYNC */
    closeSync: Nt(x.closeSync, Ae),
    fsyncSync: Nt(x.fsyncSync, Ae),
    openSync: Nt(x.openSync, Ae),
    readFileSync: Nt(x.readFileSync, Ae),
    renameSync: Nt(x.renameSync, Ae),
    statSync: Nt(x.statSync, Ae),
    writeSync: Nt(x.writeSync, Ae),
    writeFileSync: Nt(x.writeFileSync, Ae)
  }
}, ad = "utf8", fi = 438, od = 511, id = {}, cd = me.geteuid ? me.geteuid() : -1, ld = me.getegid ? me.getegid() : -1, ud = 1e3, dd = !!me.getuid;
me.getuid && me.getuid();
const hi = 128, fd = (e) => e instanceof Error && "code" in e, mi = (e) => typeof e == "string", vs = (e) => e === void 0, hd = me.platform === "linux", Hc = me.platform === "win32", la = ["SIGHUP", "SIGINT", "SIGTERM"];
Hc || la.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
hd && la.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
class md {
  /* CONSTRUCTOR */
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set(), this.exited = !1, this.exit = (t) => {
      if (!this.exited) {
        this.exited = !0;
        for (const r of this.callbacks)
          r();
        t && (Hc && t !== "SIGINT" && t !== "SIGTERM" && t !== "SIGKILL" ? me.kill(me.pid, "SIGTERM") : me.kill(me.pid, t));
      }
    }, this.hook = () => {
      me.once("exit", () => this.exit());
      for (const t of la)
        try {
          me.once(t, () => this.exit(t));
        } catch {
        }
    }, this.register = (t) => (this.callbacks.add(t), () => {
      this.callbacks.delete(t);
    }), this.hook();
  }
}
const pd = new md(), $d = pd.register, De = {
  /* VARIABLES */
  store: {},
  // filePath => purge
  /* API */
  create: (e) => {
    const t = `000000${Math.floor(Math.random() * 16777215).toString(16)}`.slice(-6), s = `.tmp-${Date.now().toString().slice(-10)}${t}`;
    return `${e}${s}`;
  },
  get: (e, t, r = !0) => {
    const n = De.truncate(t(e));
    return n in De.store ? De.get(e, t, r) : (De.store[n] = r, [n, () => delete De.store[n]]);
  },
  purge: (e) => {
    De.store[e] && (delete De.store[e], Ce.attempt.unlink(e));
  },
  purgeSync: (e) => {
    De.store[e] && (delete De.store[e], Ce.attempt.unlinkSync(e));
  },
  purgeSyncAll: () => {
    for (const e in De.store)
      De.purgeSync(e);
  },
  truncate: (e) => {
    const t = se.basename(e);
    if (t.length <= hi)
      return e;
    const r = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(t);
    if (!r)
      return e;
    const n = t.length - hi;
    return `${e.slice(0, -t.length)}${r[1]}${r[2].slice(0, -n)}${r[3]}`;
  }
};
$d(De.purgeSyncAll);
function Bc(e, t, r = id) {
  if (mi(r))
    return Bc(e, t, { encoding: r });
  const s = { timeout: r.timeout ?? ud };
  let a = null, o = null, l = null;
  try {
    const c = Ce.attempt.realpathSync(e), d = !!c;
    e = c || e, [o, a] = De.get(e, r.tmpCreate || De.create, r.tmpPurge !== !1);
    const u = dd && vs(r.chown), h = vs(r.mode);
    if (d && (u || h)) {
      const w = Ce.attempt.statSync(e);
      w && (r = { ...r }, u && (r.chown = { uid: w.uid, gid: w.gid }), h && (r.mode = w.mode));
    }
    if (!d) {
      const w = se.dirname(e);
      Ce.attempt.mkdirSync(w, {
        mode: od,
        recursive: !0
      });
    }
    l = Ce.retry.openSync(s)(o, "w", r.mode || fi), r.tmpCreated && r.tmpCreated(o), mi(t) ? Ce.retry.writeSync(s)(l, t, 0, r.encoding || ad) : vs(t) || Ce.retry.writeSync(s)(l, t, 0, t.length, 0), r.fsync !== !1 && (r.fsyncWait !== !1 ? Ce.retry.fsyncSync(s)(l) : Ce.attempt.fsync(l)), Ce.retry.closeSync(s)(l), l = null, r.chown && (r.chown.uid !== cd || r.chown.gid !== ld) && Ce.attempt.chownSync(o, r.chown.uid, r.chown.gid), r.mode && r.mode !== fi && Ce.attempt.chmodSync(o, r.mode);
    try {
      Ce.retry.renameSync(s)(o, e);
    } catch (w) {
      if (!fd(w) || w.code !== "ENAMETOOLONG")
        throw w;
      Ce.retry.renameSync(s)(o, De.truncate(e));
    }
    a(), o = null;
  } finally {
    l && Ce.attempt.closeSync(l), o && De.purge(o);
  }
}
function Xc(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var zs = { exports: {} }, Jc = {}, yt = {}, Kt = {}, tn = {}, ee = {}, xr = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
  class t {
  }
  e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends t {
    constructor(E) {
      if (super(), !e.IDENTIFIER.test(E))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = E;
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
    constructor(E) {
      super(), this._items = typeof E == "string" ? [E] : E;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const E = this._items[0];
      return E === "" || E === '""';
    }
    get str() {
      var E;
      return (E = this._str) !== null && E !== void 0 ? E : this._str = this._items.reduce((R, O) => `${R}${O}`, "");
    }
    get names() {
      var E;
      return (E = this._names) !== null && E !== void 0 ? E : this._names = this._items.reduce((R, O) => (O instanceof r && (R[O.str] = (R[O.str] || 0) + 1), R), {});
    }
  }
  e._Code = n, e.nil = new n("");
  function s(m, ...E) {
    const R = [m[0]];
    let O = 0;
    for (; O < E.length; )
      l(R, E[O]), R.push(m[++O]);
    return new n(R);
  }
  e._ = s;
  const a = new n("+");
  function o(m, ...E) {
    const R = [y(m[0])];
    let O = 0;
    for (; O < E.length; )
      R.push(a), l(R, E[O]), R.push(a, y(m[++O]));
    return c(R), new n(R);
  }
  e.str = o;
  function l(m, E) {
    E instanceof n ? m.push(...E._items) : E instanceof r ? m.push(E) : m.push(h(E));
  }
  e.addCodeArg = l;
  function c(m) {
    let E = 1;
    for (; E < m.length - 1; ) {
      if (m[E] === a) {
        const R = d(m[E - 1], m[E + 1]);
        if (R !== void 0) {
          m.splice(E - 1, 3, R);
          continue;
        }
        m[E++] = "+";
      }
      E++;
    }
  }
  function d(m, E) {
    if (E === '""')
      return m;
    if (m === '""')
      return E;
    if (typeof m == "string")
      return E instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof E != "string" ? `${m.slice(0, -1)}${E}"` : E[0] === '"' ? m.slice(0, -1) + E.slice(1) : void 0;
    if (typeof E == "string" && E[0] === '"' && !(m instanceof r))
      return `"${m}${E.slice(1)}`;
  }
  function u(m, E) {
    return E.emptyStr() ? m : m.emptyStr() ? E : o`${m}${E}`;
  }
  e.strConcat = u;
  function h(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : y(Array.isArray(m) ? m.join(",") : m);
  }
  function w(m) {
    return new n(y(m));
  }
  e.stringify = w;
  function y(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  e.safeStringify = y;
  function v(m) {
    return typeof m == "string" && e.IDENTIFIER.test(m) ? new n(`.${m}`) : s`[${m}]`;
  }
  e.getProperty = v;
  function _(m) {
    if (typeof m == "string" && e.IDENTIFIER.test(m))
      return new n(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  e.getEsmExportName = _;
  function g(m) {
    return new n(m.toString());
  }
  e.regexpCode = g;
})(xr);
var Us = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = xr;
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
    constructor({ prefixes: d, parent: u } = {}) {
      this._names = {}, this._prefixes = d, this._parent = u;
    }
    toName(d) {
      return d instanceof t.Name ? d : this.name(d);
    }
    name(d) {
      return new t.Name(this._newName(d));
    }
    _newName(d) {
      const u = this._names[d] || this._nameGroup(d);
      return `${d}${u.index++}`;
    }
    _nameGroup(d) {
      var u, h;
      if (!((h = (u = this._parent) === null || u === void 0 ? void 0 : u._prefixes) === null || h === void 0) && h.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  e.Scope = s;
  class a extends t.Name {
    constructor(d, u) {
      super(u), this.prefix = d;
    }
    setValue(d, { property: u, itemIndex: h }) {
      this.value = d, this.scopePath = (0, t._)`.${new t.Name(u)}[${h}]`;
    }
  }
  e.ValueScopeName = a;
  const o = (0, t._)`\n`;
  class l extends s {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? o : t.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new a(d, this._newName(d));
    }
    value(d, u) {
      var h;
      if (u.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const w = this.toName(d), { prefix: y } = w, v = (h = u.key) !== null && h !== void 0 ? h : u.ref;
      let _ = this._values[y];
      if (_) {
        const E = _.get(v);
        if (E)
          return E;
      } else
        _ = this._values[y] = /* @__PURE__ */ new Map();
      _.set(v, w);
      const g = this._scope[y] || (this._scope[y] = []), m = g.length;
      return g[m] = u.ref, w.setValue(u, { property: y, itemIndex: m }), w;
    }
    getValue(d, u) {
      const h = this._values[d];
      if (h)
        return h.get(u);
    }
    scopeRefs(d, u = this._values) {
      return this._reduceValues(u, (h) => {
        if (h.scopePath === void 0)
          throw new Error(`CodeGen: name "${h}" has no value`);
        return (0, t._)`${d}${h.scopePath}`;
      });
    }
    scopeCode(d = this._values, u, h) {
      return this._reduceValues(d, (w) => {
        if (w.value === void 0)
          throw new Error(`CodeGen: name "${w}" has no value`);
        return w.value.code;
      }, u, h);
    }
    _reduceValues(d, u, h = {}, w) {
      let y = t.nil;
      for (const v in d) {
        const _ = d[v];
        if (!_)
          continue;
        const g = h[v] = h[v] || /* @__PURE__ */ new Map();
        _.forEach((m) => {
          if (g.has(m))
            return;
          g.set(m, n.Started);
          let E = u(m);
          if (E) {
            const R = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
            y = (0, t._)`${y}${R} ${m} = ${E};${this.opts._n}`;
          } else if (E = w == null ? void 0 : w(m))
            y = (0, t._)`${y}${E}${this.opts._n}`;
          else
            throw new r(m);
          g.set(m, n.Completed);
        });
      }
      return y;
    }
  }
  e.ValueScope = l;
})(Us);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = xr, r = Us;
  var n = xr;
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
  var s = Us;
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
    constructor(i, f, b) {
      super(), this.varKind = i, this.name = f, this.rhs = b;
    }
    render({ es5: i, _n: f }) {
      const b = i ? r.varKinds.var : this.varKind, j = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${b} ${this.name}${j};` + f;
    }
    optimizeNames(i, f) {
      if (i[this.name.str])
        return this.rhs && (this.rhs = H(this.rhs, i, f)), this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class l extends a {
    constructor(i, f, b) {
      super(), this.lhs = i, this.rhs = f, this.sideEffects = b;
    }
    render({ _n: i }) {
      return `${this.lhs} = ${this.rhs};` + i;
    }
    optimizeNames(i, f) {
      if (!(this.lhs instanceof t.Name && !i[this.lhs.str] && !this.sideEffects))
        return this.rhs = H(this.rhs, i, f), this;
    }
    get names() {
      const i = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return W(i, this.rhs);
    }
  }
  class c extends l {
    constructor(i, f, b, j) {
      super(i, b, j), this.op = f;
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
  class u extends a {
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
  class w extends a {
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
      return this.code = H(this.code, i, f), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class y extends a {
    constructor(i = []) {
      super(), this.nodes = i;
    }
    render(i) {
      return this.nodes.reduce((f, b) => f + b.render(i), "");
    }
    optimizeNodes() {
      const { nodes: i } = this;
      let f = i.length;
      for (; f--; ) {
        const b = i[f].optimizeNodes();
        Array.isArray(b) ? i.splice(f, 1, ...b) : b ? i[f] = b : i.splice(f, 1);
      }
      return i.length > 0 ? this : void 0;
    }
    optimizeNames(i, f) {
      const { nodes: b } = this;
      let j = b.length;
      for (; j--; ) {
        const A = b[j];
        A.optimizeNames(i, f) || (ce(i, A.names), b.splice(j, 1));
      }
      return b.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((i, f) => X(i, f.names), {});
    }
  }
  class v extends y {
    render(i) {
      return "{" + i._n + super.render(i) + "}" + i._n;
    }
  }
  class _ extends y {
  }
  class g extends v {
  }
  g.kind = "else";
  class m extends v {
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
        const b = f.optimizeNodes();
        f = this.else = Array.isArray(b) ? new g(b) : b;
      }
      if (f)
        return i === !1 ? f instanceof m ? f : f.nodes : this.nodes.length ? this : new m(ve(i), f instanceof m ? [f] : f.nodes);
      if (!(i === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(i, f) {
      var b;
      if (this.else = (b = this.else) === null || b === void 0 ? void 0 : b.optimizeNames(i, f), !!(super.optimizeNames(i, f) || this.else))
        return this.condition = H(this.condition, i, f), this;
    }
    get names() {
      const i = super.names;
      return W(i, this.condition), this.else && X(i, this.else.names), i;
    }
  }
  m.kind = "if";
  class E extends v {
  }
  E.kind = "for";
  class R extends E {
    constructor(i) {
      super(), this.iteration = i;
    }
    render(i) {
      return `for(${this.iteration})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iteration = H(this.iteration, i, f), this;
    }
    get names() {
      return X(super.names, this.iteration.names);
    }
  }
  class O extends E {
    constructor(i, f, b, j) {
      super(), this.varKind = i, this.name = f, this.from = b, this.to = j;
    }
    render(i) {
      const f = i.es5 ? r.varKinds.var : this.varKind, { name: b, from: j, to: A } = this;
      return `for(${f} ${b}=${j}; ${b}<${A}; ${b}++)` + super.render(i);
    }
    get names() {
      const i = W(super.names, this.from);
      return W(i, this.to);
    }
  }
  class T extends E {
    constructor(i, f, b, j) {
      super(), this.loop = i, this.varKind = f, this.name = b, this.iterable = j;
    }
    render(i) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iterable = H(this.iterable, i, f), this;
    }
    get names() {
      return X(super.names, this.iterable.names);
    }
  }
  class K extends v {
    constructor(i, f, b) {
      super(), this.name = i, this.args = f, this.async = b;
    }
    render(i) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(i);
    }
  }
  K.kind = "func";
  class J extends y {
    render(i) {
      return "return " + super.render(i);
    }
  }
  J.kind = "return";
  class ie extends v {
    render(i) {
      let f = "try" + super.render(i);
      return this.catch && (f += this.catch.render(i)), this.finally && (f += this.finally.render(i)), f;
    }
    optimizeNodes() {
      var i, f;
      return super.optimizeNodes(), (i = this.catch) === null || i === void 0 || i.optimizeNodes(), (f = this.finally) === null || f === void 0 || f.optimizeNodes(), this;
    }
    optimizeNames(i, f) {
      var b, j;
      return super.optimizeNames(i, f), (b = this.catch) === null || b === void 0 || b.optimizeNames(i, f), (j = this.finally) === null || j === void 0 || j.optimizeNames(i, f), this;
    }
    get names() {
      const i = super.names;
      return this.catch && X(i, this.catch.names), this.finally && X(i, this.finally.names), i;
    }
  }
  class de extends v {
    constructor(i) {
      super(), this.error = i;
    }
    render(i) {
      return `catch(${this.error})` + super.render(i);
    }
  }
  de.kind = "catch";
  class pe extends v {
    render(i) {
      return "finally" + super.render(i);
    }
  }
  pe.kind = "finally";
  class q {
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
      const b = this._extScope.value(i, f);
      return (this._values[b.prefix] || (this._values[b.prefix] = /* @__PURE__ */ new Set())).add(b), b;
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
    _def(i, f, b, j) {
      const A = this._scope.toName(f);
      return b !== void 0 && j && (this._constants[A.str] = b), this._leafNode(new o(i, A, b)), A;
    }
    // `const` declaration (`var` in es5 mode)
    const(i, f, b) {
      return this._def(r.varKinds.const, i, f, b);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(i, f, b) {
      return this._def(r.varKinds.let, i, f, b);
    }
    // `var` declaration with optional assignment
    var(i, f, b) {
      return this._def(r.varKinds.var, i, f, b);
    }
    // assignment code
    assign(i, f, b) {
      return this._leafNode(new l(i, f, b));
    }
    // `+=` code
    add(i, f) {
      return this._leafNode(new c(i, e.operators.ADD, f));
    }
    // appends passed SafeExpr to code or executes Block
    code(i) {
      return typeof i == "function" ? i() : i !== t.nil && this._leafNode(new w(i)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...i) {
      const f = ["{"];
      for (const [b, j] of i)
        f.length > 1 && f.push(","), f.push(b), (b !== j || this.opts.es5) && (f.push(":"), (0, t.addCodeArg)(f, j));
      return f.push("}"), new t._Code(f);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(i, f, b) {
      if (this._blockNode(new m(i)), f && b)
        this.code(f).else().code(b).endIf();
      else if (f)
        this.code(f).endIf();
      else if (b)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(i) {
      return this._elseNode(new m(i));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new g());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, g);
    }
    _for(i, f) {
      return this._blockNode(i), f && this.code(f).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(i, f) {
      return this._for(new R(i), f);
    }
    // `for` statement for a range of values
    forRange(i, f, b, j, A = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const F = this._scope.toName(i);
      return this._for(new O(A, F, f, b), () => j(F));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(i, f, b, j = r.varKinds.const) {
      const A = this._scope.toName(i);
      if (this.opts.es5) {
        const F = f instanceof t.Name ? f : this.var("_arr", f);
        return this.forRange("_i", 0, (0, t._)`${F}.length`, (U) => {
          this.var(A, (0, t._)`${F}[${U}]`), b(A);
        });
      }
      return this._for(new T("of", j, A, f), () => b(A));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(i, f, b, j = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(i, (0, t._)`Object.keys(${f})`, b);
      const A = this._scope.toName(i);
      return this._for(new T("in", j, A, f), () => b(A));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(E);
    }
    // `label` statement
    label(i) {
      return this._leafNode(new d(i));
    }
    // `break` statement
    break(i) {
      return this._leafNode(new u(i));
    }
    // `return` statement
    return(i) {
      const f = new J();
      if (this._blockNode(f), this.code(i), f.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(J);
    }
    // `try` statement
    try(i, f, b) {
      if (!f && !b)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const j = new ie();
      if (this._blockNode(j), this.code(i), f) {
        const A = this.name("e");
        this._currNode = j.catch = new de(A), f(A);
      }
      return b && (this._currNode = j.finally = new pe(), this.code(b)), this._endBlockNode(de, pe);
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
      const b = this._nodes.length - f;
      if (b < 0 || i !== void 0 && b !== i)
        throw new Error(`CodeGen: wrong number of nodes: ${b} vs ${i} expected`);
      return this._nodes.length = f, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(i, f = t.nil, b, j) {
      return this._blockNode(new K(i, f, b)), j && this.code(j).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(K);
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
      const b = this._currNode;
      if (b instanceof i || f && b instanceof f)
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
  e.CodeGen = q;
  function X($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) + (i[f] || 0);
    return $;
  }
  function W($, i) {
    return i instanceof t._CodeOrName ? X($, i.names) : $;
  }
  function H($, i, f) {
    if ($ instanceof t.Name)
      return b($);
    if (!j($))
      return $;
    return new t._Code($._items.reduce((A, F) => (F instanceof t.Name && (F = b(F)), F instanceof t._Code ? A.push(...F._items) : A.push(F), A), []));
    function b(A) {
      const F = f[A.str];
      return F === void 0 || i[A.str] !== 1 ? A : (delete i[A.str], F);
    }
    function j(A) {
      return A instanceof t._Code && A._items.some((F) => F instanceof t.Name && i[F.str] === 1 && f[F.str] !== void 0);
    }
  }
  function ce($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) - (i[f] || 0);
  }
  function ve($) {
    return typeof $ == "boolean" || typeof $ == "number" || $ === null ? !$ : (0, t._)`!${S($)}`;
  }
  e.not = ve;
  const M = p(e.operators.AND);
  function C(...$) {
    return $.reduce(M);
  }
  e.and = C;
  const z = p(e.operators.OR);
  function P(...$) {
    return $.reduce(z);
  }
  e.or = P;
  function p($) {
    return (i, f) => i === t.nil ? f : f === t.nil ? i : (0, t._)`${S(i)} ${$} ${S(f)}`;
  }
  function S($) {
    return $ instanceof t.Name ? $ : (0, t._)`(${$})`;
  }
})(ee);
var V = {};
Object.defineProperty(V, "__esModule", { value: !0 });
V.checkStrictMode = V.getErrorPath = V.Type = V.useFunc = V.setEvaluated = V.evaluatedPropsToName = V.mergeEvaluated = V.eachItem = V.unescapeJsonPointer = V.escapeJsonPointer = V.escapeFragment = V.unescapeFragment = V.schemaRefOrVal = V.schemaHasRulesButRef = V.schemaHasRules = V.checkUnknownRules = V.alwaysValidSchema = V.toHash = void 0;
const le = ee, yd = xr;
function gd(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
V.toHash = gd;
function _d(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (Wc(e, t), !Yc(t, e.self.RULES.all));
}
V.alwaysValidSchema = _d;
function Wc(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || xc(e, `unknown keyword: "${a}"`);
}
V.checkUnknownRules = Wc;
function Yc(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
V.schemaHasRules = Yc;
function vd(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
V.schemaHasRulesButRef = vd;
function wd({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, le._)`${r}`;
  }
  return (0, le._)`${e}${t}${(0, le.getProperty)(n)}`;
}
V.schemaRefOrVal = wd;
function Ed(e) {
  return Qc(decodeURIComponent(e));
}
V.unescapeFragment = Ed;
function bd(e) {
  return encodeURIComponent(ua(e));
}
V.escapeFragment = bd;
function ua(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
V.escapeJsonPointer = ua;
function Qc(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
V.unescapeJsonPointer = Qc;
function Sd(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
V.eachItem = Sd;
function pi({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, l) => {
    const c = o === void 0 ? a : o instanceof le.Name ? (a instanceof le.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof le.Name ? (t(s, o, a), a) : r(a, o);
    return l === le.Name && !(c instanceof le.Name) ? n(s, c) : c;
  };
}
V.mergeEvaluated = {
  props: pi({
    mergeNames: (e, t, r) => e.if((0, le._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, le._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, le._)`${r} || {}`).code((0, le._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, le._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, le._)`${r} || {}`), da(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: Zc
  }),
  items: pi({
    mergeNames: (e, t, r) => e.if((0, le._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, le._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, le._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, le._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function Zc(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, le._)`{}`);
  return t !== void 0 && da(e, r, t), r;
}
V.evaluatedPropsToName = Zc;
function da(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, le._)`${t}${(0, le.getProperty)(n)}`, !0));
}
V.setEvaluated = da;
const $i = {};
function Pd(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: $i[t.code] || ($i[t.code] = new yd._Code(t.code))
  });
}
V.useFunc = Pd;
var qs;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(qs || (V.Type = qs = {}));
function Nd(e, t, r) {
  if (e instanceof le.Name) {
    const n = t === qs.Num;
    return r ? n ? (0, le._)`"[" + ${e} + "]"` : (0, le._)`"['" + ${e} + "']"` : n ? (0, le._)`"/" + ${e}` : (0, le._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, le.getProperty)(e).toString() : "/" + ua(e);
}
V.getErrorPath = Nd;
function xc(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
V.checkStrictMode = xc;
var dn = {}, yi;
function at() {
  if (yi) return dn;
  yi = 1, Object.defineProperty(dn, "__esModule", { value: !0 });
  const e = ee, t = {
    // validation function arguments
    data: new e.Name("data"),
    // data passed to validation function
    // args passed from referencing schema
    valCxt: new e.Name("valCxt"),
    // validation/data context - should not be used directly, it is destructured to the names below
    instancePath: new e.Name("instancePath"),
    parentData: new e.Name("parentData"),
    parentDataProperty: new e.Name("parentDataProperty"),
    rootData: new e.Name("rootData"),
    // root data - same as the data passed to the first/top validation function
    dynamicAnchors: new e.Name("dynamicAnchors"),
    // used to support recursiveRef and dynamicRef
    // function scoped variables
    vErrors: new e.Name("vErrors"),
    // null or array of validation errors
    errors: new e.Name("errors"),
    // counter of validation errors
    this: new e.Name("this"),
    // "globals"
    self: new e.Name("self"),
    scope: new e.Name("scope"),
    // JTD serialize/parse name for JSON string and position
    json: new e.Name("json"),
    jsonPos: new e.Name("jsonPos"),
    jsonLen: new e.Name("jsonLen"),
    jsonPart: new e.Name("jsonPart")
  };
  return dn.default = t, dn;
}
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = ee, r = V, n = at();
  e.keywordError = {
    message: ({ keyword: g }) => (0, t.str)`must pass "${g}" keyword validation`
  }, e.keyword$DataError = {
    message: ({ keyword: g, schemaType: m }) => m ? (0, t.str)`"${g}" keyword must be ${m} ($data)` : (0, t.str)`"${g}" keyword is invalid ($data)`
  };
  function s(g, m = e.keywordError, E, R) {
    const { it: O } = g, { gen: T, compositeRule: K, allErrors: J } = O, ie = h(g, m, E);
    R ?? (K || J) ? c(T, ie) : d(O, (0, t._)`[${ie}]`);
  }
  e.reportError = s;
  function a(g, m = e.keywordError, E) {
    const { it: R } = g, { gen: O, compositeRule: T, allErrors: K } = R, J = h(g, m, E);
    c(O, J), T || K || d(R, n.default.vErrors);
  }
  e.reportExtraError = a;
  function o(g, m) {
    g.assign(n.default.errors, m), g.if((0, t._)`${n.default.vErrors} !== null`, () => g.if(m, () => g.assign((0, t._)`${n.default.vErrors}.length`, m), () => g.assign(n.default.vErrors, null)));
  }
  e.resetErrorsCount = o;
  function l({ gen: g, keyword: m, schemaValue: E, data: R, errsCount: O, it: T }) {
    if (O === void 0)
      throw new Error("ajv implementation error");
    const K = g.name("err");
    g.forRange("i", O, n.default.errors, (J) => {
      g.const(K, (0, t._)`${n.default.vErrors}[${J}]`), g.if((0, t._)`${K}.instancePath === undefined`, () => g.assign((0, t._)`${K}.instancePath`, (0, t.strConcat)(n.default.instancePath, T.errorPath))), g.assign((0, t._)`${K}.schemaPath`, (0, t.str)`${T.errSchemaPath}/${m}`), T.opts.verbose && (g.assign((0, t._)`${K}.schema`, E), g.assign((0, t._)`${K}.data`, R));
    });
  }
  e.extendErrors = l;
  function c(g, m) {
    const E = g.const("err", m);
    g.if((0, t._)`${n.default.vErrors} === null`, () => g.assign(n.default.vErrors, (0, t._)`[${E}]`), (0, t._)`${n.default.vErrors}.push(${E})`), g.code((0, t._)`${n.default.errors}++`);
  }
  function d(g, m) {
    const { gen: E, validateName: R, schemaEnv: O } = g;
    O.$async ? E.throw((0, t._)`new ${g.ValidationError}(${m})`) : (E.assign((0, t._)`${R}.errors`, m), E.return(!1));
  }
  const u = {
    keyword: new t.Name("keyword"),
    schemaPath: new t.Name("schemaPath"),
    // also used in JTD errors
    params: new t.Name("params"),
    propertyName: new t.Name("propertyName"),
    message: new t.Name("message"),
    schema: new t.Name("schema"),
    parentSchema: new t.Name("parentSchema")
  };
  function h(g, m, E) {
    const { createErrors: R } = g.it;
    return R === !1 ? (0, t._)`{}` : w(g, m, E);
  }
  function w(g, m, E = {}) {
    const { gen: R, it: O } = g, T = [
      y(O, E),
      v(g, E)
    ];
    return _(g, m, T), R.object(...T);
  }
  function y({ errorPath: g }, { instancePath: m }) {
    const E = m ? (0, t.str)`${g}${(0, r.getErrorPath)(m, r.Type.Str)}` : g;
    return [n.default.instancePath, (0, t.strConcat)(n.default.instancePath, E)];
  }
  function v({ keyword: g, it: { errSchemaPath: m } }, { schemaPath: E, parentSchema: R }) {
    let O = R ? m : (0, t.str)`${m}/${g}`;
    return E && (O = (0, t.str)`${O}${(0, r.getErrorPath)(E, r.Type.Str)}`), [u.schemaPath, O];
  }
  function _(g, { params: m, message: E }, R) {
    const { keyword: O, data: T, schemaValue: K, it: J } = g, { opts: ie, propertyName: de, topSchemaRef: pe, schemaPath: q } = J;
    R.push([u.keyword, O], [u.params, typeof m == "function" ? m(g) : m || (0, t._)`{}`]), ie.messages && R.push([u.message, typeof E == "function" ? E(g) : E]), ie.verbose && R.push([u.schema, K], [u.parentSchema, (0, t._)`${pe}${q}`], [n.default.data, T]), de && R.push([u.propertyName, de]);
  }
})(tn);
var gi;
function Rd() {
  if (gi) return Kt;
  gi = 1, Object.defineProperty(Kt, "__esModule", { value: !0 }), Kt.boolOrEmptySchema = Kt.topBoolOrEmptySchema = void 0;
  const e = tn, t = ee, r = at(), n = {
    message: "boolean schema is false"
  };
  function s(l) {
    const { gen: c, schema: d, validateName: u } = l;
    d === !1 ? o(l, !1) : typeof d == "object" && d.$async === !0 ? c.return(r.default.data) : (c.assign((0, t._)`${u}.errors`, null), c.return(!0));
  }
  Kt.topBoolOrEmptySchema = s;
  function a(l, c) {
    const { gen: d, schema: u } = l;
    u === !1 ? (d.var(c, !1), o(l)) : d.var(c, !0);
  }
  Kt.boolOrEmptySchema = a;
  function o(l, c) {
    const { gen: d, data: u } = l, h = {
      gen: d,
      keyword: "false schema",
      data: u,
      schema: !1,
      schemaCode: !1,
      schemaValue: !1,
      params: {},
      it: l
    };
    (0, e.reportError)(h, n, void 0, c);
  }
  return Kt;
}
var we = {}, rr = {};
Object.defineProperty(rr, "__esModule", { value: !0 });
rr.getRules = rr.isJSONType = void 0;
const Od = ["string", "number", "integer", "boolean", "null", "object", "array"], Id = new Set(Od);
function Td(e) {
  return typeof e == "string" && Id.has(e);
}
rr.isJSONType = Td;
function jd() {
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
rr.getRules = jd;
var vt = {};
Object.defineProperty(vt, "__esModule", { value: !0 });
vt.shouldUseRule = vt.shouldUseGroup = vt.schemaHasRulesForType = void 0;
function Ad({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && el(e, n);
}
vt.schemaHasRulesForType = Ad;
function el(e, t) {
  return t.rules.some((r) => tl(e, r));
}
vt.shouldUseGroup = el;
function tl(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
vt.shouldUseRule = tl;
Object.defineProperty(we, "__esModule", { value: !0 });
we.reportTypeError = we.checkDataTypes = we.checkDataType = we.coerceAndCheckDataType = we.getJSONTypes = we.getSchemaTypes = we.DataType = void 0;
const kd = rr, Cd = vt, Dd = tn, te = ee, rl = V;
var yr;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(yr || (we.DataType = yr = {}));
function Md(e) {
  const t = nl(e.type);
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
we.getSchemaTypes = Md;
function nl(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(kd.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
we.getJSONTypes = nl;
function Vd(e, t) {
  const { gen: r, data: n, opts: s } = e, a = Ld(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, Cd.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const l = fa(t, n, s.strictNumbers, yr.Wrong);
    r.if(l, () => {
      a.length ? Fd(e, t, a) : ha(e);
    });
  }
  return o;
}
we.coerceAndCheckDataType = Vd;
const sl = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function Ld(e, t) {
  return t ? e.filter((r) => sl.has(r) || t === "array" && r === "array") : [];
}
function Fd(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, te._)`typeof ${s}`), l = n.let("coerced", (0, te._)`undefined`);
  a.coerceTypes === "array" && n.if((0, te._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, te._)`${s}[0]`).assign(o, (0, te._)`typeof ${s}`).if(fa(t, s, a.strictNumbers), () => n.assign(l, s))), n.if((0, te._)`${l} !== undefined`);
  for (const d of r)
    (sl.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), ha(e), n.endIf(), n.if((0, te._)`${l} !== undefined`, () => {
    n.assign(s, l), zd(e, l);
  });
  function c(d) {
    switch (d) {
      case "string":
        n.elseIf((0, te._)`${o} == "number" || ${o} == "boolean"`).assign(l, (0, te._)`"" + ${s}`).elseIf((0, te._)`${s} === null`).assign(l, (0, te._)`""`);
        return;
      case "number":
        n.elseIf((0, te._)`${o} == "boolean" || ${s} === null
              || (${o} == "string" && ${s} && ${s} == +${s})`).assign(l, (0, te._)`+${s}`);
        return;
      case "integer":
        n.elseIf((0, te._)`${o} === "boolean" || ${s} === null
              || (${o} === "string" && ${s} && ${s} == +${s} && !(${s} % 1))`).assign(l, (0, te._)`+${s}`);
        return;
      case "boolean":
        n.elseIf((0, te._)`${s} === "false" || ${s} === 0 || ${s} === null`).assign(l, !1).elseIf((0, te._)`${s} === "true" || ${s} === 1`).assign(l, !0);
        return;
      case "null":
        n.elseIf((0, te._)`${s} === "" || ${s} === 0 || ${s} === false`), n.assign(l, null);
        return;
      case "array":
        n.elseIf((0, te._)`${o} === "string" || ${o} === "number"
              || ${o} === "boolean" || ${s} === null`).assign(l, (0, te._)`[${s}]`);
    }
  }
}
function zd({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, te._)`${t} !== undefined`, () => e.assign((0, te._)`${t}[${r}]`, n));
}
function Ks(e, t, r, n = yr.Correct) {
  const s = n === yr.Correct ? te.operators.EQ : te.operators.NEQ;
  let a;
  switch (e) {
    case "null":
      return (0, te._)`${t} ${s} null`;
    case "array":
      a = (0, te._)`Array.isArray(${t})`;
      break;
    case "object":
      a = (0, te._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
      break;
    case "integer":
      a = o((0, te._)`!(${t} % 1) && !isNaN(${t})`);
      break;
    case "number":
      a = o();
      break;
    default:
      return (0, te._)`typeof ${t} ${s} ${e}`;
  }
  return n === yr.Correct ? a : (0, te.not)(a);
  function o(l = te.nil) {
    return (0, te.and)((0, te._)`typeof ${t} == "number"`, l, r ? (0, te._)`isFinite(${t})` : te.nil);
  }
}
we.checkDataType = Ks;
function fa(e, t, r, n) {
  if (e.length === 1)
    return Ks(e[0], t, r, n);
  let s;
  const a = (0, rl.toHash)(e);
  if (a.array && a.object) {
    const o = (0, te._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, te._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = te.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, te.and)(s, Ks(o, t, r, n));
  return s;
}
we.checkDataTypes = fa;
const Ud = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, te._)`{type: ${e}}` : (0, te._)`{type: ${t}}`
};
function ha(e) {
  const t = qd(e);
  (0, Dd.reportError)(t, Ud);
}
we.reportTypeError = ha;
function qd(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, rl.schemaRefOrVal)(e, n, "type");
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
var Vr = {}, _i;
function Kd() {
  if (_i) return Vr;
  _i = 1, Object.defineProperty(Vr, "__esModule", { value: !0 }), Vr.assignDefaults = void 0;
  const e = ee, t = V;
  function r(s, a) {
    const { properties: o, items: l } = s.schema;
    if (a === "object" && o)
      for (const c in o)
        n(s, c, o[c].default);
    else a === "array" && Array.isArray(l) && l.forEach((c, d) => n(s, d, c.default));
  }
  Vr.assignDefaults = r;
  function n(s, a, o) {
    const { gen: l, compositeRule: c, data: d, opts: u } = s;
    if (o === void 0)
      return;
    const h = (0, e._)`${d}${(0, e.getProperty)(a)}`;
    if (c) {
      (0, t.checkStrictMode)(s, `default is ignored for: ${h}`);
      return;
    }
    let w = (0, e._)`${h} === undefined`;
    u.useDefaults === "empty" && (w = (0, e._)`${w} || ${h} === null || ${h} === ""`), l.if(w, (0, e._)`${h} = ${(0, e.stringify)(o)}`);
  }
  return Vr;
}
var Qe = {}, ae = {};
Object.defineProperty(ae, "__esModule", { value: !0 });
ae.validateUnion = ae.validateArray = ae.usePattern = ae.callValidateCode = ae.schemaProperties = ae.allSchemaProperties = ae.noPropertyInData = ae.propertyInData = ae.isOwnProperty = ae.hasPropFunc = ae.reportMissingProp = ae.checkMissingProp = ae.checkReportMissingProp = void 0;
const fe = ee, ma = V, Rt = at(), Gd = V;
function Hd(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if($a(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, fe._)`${t}` }, !0), e.error();
  });
}
ae.checkReportMissingProp = Hd;
function Bd({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, fe.or)(...n.map((a) => (0, fe.and)($a(e, t, a, r.ownProperties), (0, fe._)`${s} = ${a}`)));
}
ae.checkMissingProp = Bd;
function Xd(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
ae.reportMissingProp = Xd;
function al(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, fe._)`Object.prototype.hasOwnProperty`
  });
}
ae.hasPropFunc = al;
function pa(e, t, r) {
  return (0, fe._)`${al(e)}.call(${t}, ${r})`;
}
ae.isOwnProperty = pa;
function Jd(e, t, r, n) {
  const s = (0, fe._)`${t}${(0, fe.getProperty)(r)} !== undefined`;
  return n ? (0, fe._)`${s} && ${pa(e, t, r)}` : s;
}
ae.propertyInData = Jd;
function $a(e, t, r, n) {
  const s = (0, fe._)`${t}${(0, fe.getProperty)(r)} === undefined`;
  return n ? (0, fe.or)(s, (0, fe.not)(pa(e, t, r))) : s;
}
ae.noPropertyInData = $a;
function ol(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
ae.allSchemaProperties = ol;
function Wd(e, t) {
  return ol(t).filter((r) => !(0, ma.alwaysValidSchema)(e, t[r]));
}
ae.schemaProperties = Wd;
function Yd({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, l, c, d) {
  const u = d ? (0, fe._)`${e}, ${t}, ${n}${s}` : t, h = [
    [Rt.default.instancePath, (0, fe.strConcat)(Rt.default.instancePath, a)],
    [Rt.default.parentData, o.parentData],
    [Rt.default.parentDataProperty, o.parentDataProperty],
    [Rt.default.rootData, Rt.default.rootData]
  ];
  o.opts.dynamicRef && h.push([Rt.default.dynamicAnchors, Rt.default.dynamicAnchors]);
  const w = (0, fe._)`${u}, ${r.object(...h)}`;
  return c !== fe.nil ? (0, fe._)`${l}.call(${c}, ${w})` : (0, fe._)`${l}(${w})`;
}
ae.callValidateCode = Yd;
const Qd = (0, fe._)`new RegExp`;
function Zd({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, fe._)`${s.code === "new RegExp" ? Qd : (0, Gd.useFunc)(e, s)}(${r}, ${n})`
  });
}
ae.usePattern = Zd;
function xd(e) {
  const { gen: t, data: r, keyword: n, it: s } = e, a = t.name("valid");
  if (s.allErrors) {
    const l = t.let("valid", !0);
    return o(() => t.assign(l, !1)), l;
  }
  return t.var(a, !0), o(() => t.break()), a;
  function o(l) {
    const c = t.const("len", (0, fe._)`${r}.length`);
    t.forRange("i", 0, c, (d) => {
      e.subschema({
        keyword: n,
        dataProp: d,
        dataPropType: ma.Type.Num
      }, a), t.if((0, fe.not)(a), l);
    });
  }
}
ae.validateArray = xd;
function ef(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, ma.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
    return;
  const o = t.let("valid", !1), l = t.name("_valid");
  t.block(() => r.forEach((c, d) => {
    const u = e.subschema({
      keyword: n,
      schemaProp: d,
      compositeRule: !0
    }, l);
    t.assign(o, (0, fe._)`${o} || ${l}`), e.mergeValidEvaluated(u, l) || t.if((0, fe.not)(o));
  })), e.result(o, () => e.reset(), () => e.error(!0));
}
ae.validateUnion = ef;
var vi;
function tf() {
  if (vi) return Qe;
  vi = 1, Object.defineProperty(Qe, "__esModule", { value: !0 }), Qe.validateKeywordUsage = Qe.validSchemaType = Qe.funcKeywordCode = Qe.macroKeywordCode = void 0;
  const e = ee, t = at(), r = ae, n = tn;
  function s(w, y) {
    const { gen: v, keyword: _, schema: g, parentSchema: m, it: E } = w, R = y.macro.call(E.self, g, m, E), O = d(v, _, R);
    E.opts.validateSchema !== !1 && E.self.validateSchema(R, !0);
    const T = v.name("valid");
    w.subschema({
      schema: R,
      schemaPath: e.nil,
      errSchemaPath: `${E.errSchemaPath}/${_}`,
      topSchemaRef: O,
      compositeRule: !0
    }, T), w.pass(T, () => w.error(!0));
  }
  Qe.macroKeywordCode = s;
  function a(w, y) {
    var v;
    const { gen: _, keyword: g, schema: m, parentSchema: E, $data: R, it: O } = w;
    c(O, y);
    const T = !R && y.compile ? y.compile.call(O.self, m, E, O) : y.validate, K = d(_, g, T), J = _.let("valid");
    w.block$data(J, ie), w.ok((v = y.valid) !== null && v !== void 0 ? v : J);
    function ie() {
      if (y.errors === !1)
        q(), y.modifying && o(w), X(() => w.error());
      else {
        const W = y.async ? de() : pe();
        y.modifying && o(w), X(() => l(w, W));
      }
    }
    function de() {
      const W = _.let("ruleErrs", null);
      return _.try(() => q((0, e._)`await `), (H) => _.assign(J, !1).if((0, e._)`${H} instanceof ${O.ValidationError}`, () => _.assign(W, (0, e._)`${H}.errors`), () => _.throw(H))), W;
    }
    function pe() {
      const W = (0, e._)`${K}.errors`;
      return _.assign(W, null), q(e.nil), W;
    }
    function q(W = y.async ? (0, e._)`await ` : e.nil) {
      const H = O.opts.passContext ? t.default.this : t.default.self, ce = !("compile" in y && !R || y.schema === !1);
      _.assign(J, (0, e._)`${W}${(0, r.callValidateCode)(w, K, H, ce)}`, y.modifying);
    }
    function X(W) {
      var H;
      _.if((0, e.not)((H = y.valid) !== null && H !== void 0 ? H : J), W);
    }
  }
  Qe.funcKeywordCode = a;
  function o(w) {
    const { gen: y, data: v, it: _ } = w;
    y.if(_.parentData, () => y.assign(v, (0, e._)`${_.parentData}[${_.parentDataProperty}]`));
  }
  function l(w, y) {
    const { gen: v } = w;
    v.if((0, e._)`Array.isArray(${y})`, () => {
      v.assign(t.default.vErrors, (0, e._)`${t.default.vErrors} === null ? ${y} : ${t.default.vErrors}.concat(${y})`).assign(t.default.errors, (0, e._)`${t.default.vErrors}.length`), (0, n.extendErrors)(w);
    }, () => w.error());
  }
  function c({ schemaEnv: w }, y) {
    if (y.async && !w.$async)
      throw new Error("async keyword in sync schema");
  }
  function d(w, y, v) {
    if (v === void 0)
      throw new Error(`keyword "${y}" failed to compile`);
    return w.scopeValue("keyword", typeof v == "function" ? { ref: v } : { ref: v, code: (0, e.stringify)(v) });
  }
  function u(w, y, v = !1) {
    return !y.length || y.some((_) => _ === "array" ? Array.isArray(w) : _ === "object" ? w && typeof w == "object" && !Array.isArray(w) : typeof w == _ || v && typeof w > "u");
  }
  Qe.validSchemaType = u;
  function h({ schema: w, opts: y, self: v, errSchemaPath: _ }, g, m) {
    if (Array.isArray(g.keyword) ? !g.keyword.includes(m) : g.keyword !== m)
      throw new Error("ajv implementation error");
    const E = g.dependencies;
    if (E != null && E.some((R) => !Object.prototype.hasOwnProperty.call(w, R)))
      throw new Error(`parent schema must have dependencies of ${m}: ${E.join(",")}`);
    if (g.validateSchema && !g.validateSchema(w[m])) {
      const O = `keyword "${m}" value is invalid at path "${_}": ` + v.errorsText(g.validateSchema.errors);
      if (y.validateSchema === "log")
        v.logger.error(O);
      else
        throw new Error(O);
    }
  }
  return Qe.validateKeywordUsage = h, Qe;
}
var gt = {}, wi;
function rf() {
  if (wi) return gt;
  wi = 1, Object.defineProperty(gt, "__esModule", { value: !0 }), gt.extendSubschemaMode = gt.extendSubschemaData = gt.getSubschema = void 0;
  const e = ee, t = V;
  function r(a, { keyword: o, schemaProp: l, schema: c, schemaPath: d, errSchemaPath: u, topSchemaRef: h }) {
    if (o !== void 0 && c !== void 0)
      throw new Error('both "keyword" and "schema" passed, only one allowed');
    if (o !== void 0) {
      const w = a.schema[o];
      return l === void 0 ? {
        schema: w,
        schemaPath: (0, e._)`${a.schemaPath}${(0, e.getProperty)(o)}`,
        errSchemaPath: `${a.errSchemaPath}/${o}`
      } : {
        schema: w[l],
        schemaPath: (0, e._)`${a.schemaPath}${(0, e.getProperty)(o)}${(0, e.getProperty)(l)}`,
        errSchemaPath: `${a.errSchemaPath}/${o}/${(0, t.escapeFragment)(l)}`
      };
    }
    if (c !== void 0) {
      if (d === void 0 || u === void 0 || h === void 0)
        throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return {
        schema: c,
        schemaPath: d,
        topSchemaRef: h,
        errSchemaPath: u
      };
    }
    throw new Error('either "keyword" or "schema" must be passed');
  }
  gt.getSubschema = r;
  function n(a, o, { dataProp: l, dataPropType: c, data: d, dataTypes: u, propertyName: h }) {
    if (d !== void 0 && l !== void 0)
      throw new Error('both "data" and "dataProp" passed, only one allowed');
    const { gen: w } = o;
    if (l !== void 0) {
      const { errorPath: v, dataPathArr: _, opts: g } = o, m = w.let("data", (0, e._)`${o.data}${(0, e.getProperty)(l)}`, !0);
      y(m), a.errorPath = (0, e.str)`${v}${(0, t.getErrorPath)(l, c, g.jsPropertySyntax)}`, a.parentDataProperty = (0, e._)`${l}`, a.dataPathArr = [..._, a.parentDataProperty];
    }
    if (d !== void 0) {
      const v = d instanceof e.Name ? d : w.let("data", d, !0);
      y(v), h !== void 0 && (a.propertyName = h);
    }
    u && (a.dataTypes = u);
    function y(v) {
      a.data = v, a.dataLevel = o.dataLevel + 1, a.dataTypes = [], o.definedProperties = /* @__PURE__ */ new Set(), a.parentData = o.data, a.dataNames = [...o.dataNames, v];
    }
  }
  gt.extendSubschemaData = n;
  function s(a, { jtdDiscriminator: o, jtdMetadata: l, compositeRule: c, createErrors: d, allErrors: u }) {
    c !== void 0 && (a.compositeRule = c), d !== void 0 && (a.createErrors = d), u !== void 0 && (a.allErrors = u), a.jtdDiscriminator = o, a.jtdMetadata = l;
  }
  return gt.extendSubschemaMode = s, gt;
}
var Oe = {}, Zn = function e(t, r) {
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
}, il = { exports: {} }, Vt = il.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  An(t, n, s, e, "", e);
};
Vt.keywords = {
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
Vt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Vt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Vt.skipKeywords = {
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
function An(e, t, r, n, s, a, o, l, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, l, c, d);
    for (var u in n) {
      var h = n[u];
      if (Array.isArray(h)) {
        if (u in Vt.arrayKeywords)
          for (var w = 0; w < h.length; w++)
            An(e, t, r, h[w], s + "/" + u + "/" + w, a, s, u, n, w);
      } else if (u in Vt.propsKeywords) {
        if (h && typeof h == "object")
          for (var y in h)
            An(e, t, r, h[y], s + "/" + u + "/" + nf(y), a, s, u, n, y);
      } else (u in Vt.keywords || e.allKeys && !(u in Vt.skipKeywords)) && An(e, t, r, h, s + "/" + u, a, s, u, n);
    }
    r(n, s, a, o, l, c, d);
  }
}
function nf(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var sf = il.exports;
Object.defineProperty(Oe, "__esModule", { value: !0 });
Oe.getSchemaRefs = Oe.resolveUrl = Oe.normalizeId = Oe._getFullPath = Oe.getFullPath = Oe.inlineRef = void 0;
const af = V, of = Zn, cf = sf, lf = /* @__PURE__ */ new Set([
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
function uf(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !Gs(e) : t ? cl(e) <= t : !1;
}
Oe.inlineRef = uf;
const df = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function Gs(e) {
  for (const t in e) {
    if (df.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(Gs) || typeof r == "object" && Gs(r))
      return !0;
  }
  return !1;
}
function cl(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !lf.has(r) && (typeof e[r] == "object" && (0, af.eachItem)(e[r], (n) => t += cl(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function ll(e, t = "", r) {
  r !== !1 && (t = gr(t));
  const n = e.parse(t);
  return ul(e, n);
}
Oe.getFullPath = ll;
function ul(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
Oe._getFullPath = ul;
const ff = /#\/?$/;
function gr(e) {
  return e ? e.replace(ff, "") : "";
}
Oe.normalizeId = gr;
function hf(e, t, r) {
  return r = gr(r), e.resolve(t, r);
}
Oe.resolveUrl = hf;
const mf = /^[a-z_][-a-z0-9._]*$/i;
function pf(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = gr(e[r] || t), a = { "": s }, o = ll(n, s, !1), l = {}, c = /* @__PURE__ */ new Set();
  return cf(e, { allKeys: !0 }, (h, w, y, v) => {
    if (v === void 0)
      return;
    const _ = o + w;
    let g = a[v];
    typeof h[r] == "string" && (g = m.call(this, h[r])), E.call(this, h.$anchor), E.call(this, h.$dynamicAnchor), a[w] = g;
    function m(R) {
      const O = this.opts.uriResolver.resolve;
      if (R = gr(g ? O(g, R) : R), c.has(R))
        throw u(R);
      c.add(R);
      let T = this.refs[R];
      return typeof T == "string" && (T = this.refs[T]), typeof T == "object" ? d(h, T.schema, R) : R !== gr(_) && (R[0] === "#" ? (d(h, l[R], R), l[R] = h) : this.refs[R] = _), R;
    }
    function E(R) {
      if (typeof R == "string") {
        if (!mf.test(R))
          throw new Error(`invalid anchor "${R}"`);
        m.call(this, `#${R}`);
      }
    }
  }), l;
  function d(h, w, y) {
    if (w !== void 0 && !of(h, w))
      throw u(y);
  }
  function u(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
Oe.getSchemaRefs = pf;
var Ei;
function xn() {
  if (Ei) return yt;
  Ei = 1, Object.defineProperty(yt, "__esModule", { value: !0 }), yt.getData = yt.KeywordCxt = yt.validateFunctionCode = void 0;
  const e = Rd(), t = we, r = vt, n = we, s = Kd(), a = tf(), o = rf(), l = ee, c = at(), d = Oe, u = V, h = tn;
  function w(N) {
    if (T(N) && (J(N), O(N))) {
      g(N);
      return;
    }
    y(N, () => (0, e.topBoolOrEmptySchema)(N));
  }
  yt.validateFunctionCode = w;
  function y({ gen: N, validateName: I, schema: k, schemaEnv: D, opts: G }, Q) {
    G.code.es5 ? N.func(I, (0, l._)`${c.default.data}, ${c.default.valCxt}`, D.$async, () => {
      N.code((0, l._)`"use strict"; ${E(k, G)}`), _(N, G), N.code(Q);
    }) : N.func(I, (0, l._)`${c.default.data}, ${v(G)}`, D.$async, () => N.code(E(k, G)).code(Q));
  }
  function v(N) {
    return (0, l._)`{${c.default.instancePath}="", ${c.default.parentData}, ${c.default.parentDataProperty}, ${c.default.rootData}=${c.default.data}${N.dynamicRef ? (0, l._)`, ${c.default.dynamicAnchors}={}` : l.nil}}={}`;
  }
  function _(N, I) {
    N.if(c.default.valCxt, () => {
      N.var(c.default.instancePath, (0, l._)`${c.default.valCxt}.${c.default.instancePath}`), N.var(c.default.parentData, (0, l._)`${c.default.valCxt}.${c.default.parentData}`), N.var(c.default.parentDataProperty, (0, l._)`${c.default.valCxt}.${c.default.parentDataProperty}`), N.var(c.default.rootData, (0, l._)`${c.default.valCxt}.${c.default.rootData}`), I.dynamicRef && N.var(c.default.dynamicAnchors, (0, l._)`${c.default.valCxt}.${c.default.dynamicAnchors}`);
    }, () => {
      N.var(c.default.instancePath, (0, l._)`""`), N.var(c.default.parentData, (0, l._)`undefined`), N.var(c.default.parentDataProperty, (0, l._)`undefined`), N.var(c.default.rootData, c.default.data), I.dynamicRef && N.var(c.default.dynamicAnchors, (0, l._)`{}`);
    });
  }
  function g(N) {
    const { schema: I, opts: k, gen: D } = N;
    y(N, () => {
      k.$comment && I.$comment && W(N), pe(N), D.let(c.default.vErrors, null), D.let(c.default.errors, 0), k.unevaluated && m(N), ie(N), H(N);
    });
  }
  function m(N) {
    const { gen: I, validateName: k } = N;
    N.evaluated = I.const("evaluated", (0, l._)`${k}.evaluated`), I.if((0, l._)`${N.evaluated}.dynamicProps`, () => I.assign((0, l._)`${N.evaluated}.props`, (0, l._)`undefined`)), I.if((0, l._)`${N.evaluated}.dynamicItems`, () => I.assign((0, l._)`${N.evaluated}.items`, (0, l._)`undefined`));
  }
  function E(N, I) {
    const k = typeof N == "object" && N[I.schemaId];
    return k && (I.code.source || I.code.process) ? (0, l._)`/*# sourceURL=${k} */` : l.nil;
  }
  function R(N, I) {
    if (T(N) && (J(N), O(N))) {
      K(N, I);
      return;
    }
    (0, e.boolOrEmptySchema)(N, I);
  }
  function O({ schema: N, self: I }) {
    if (typeof N == "boolean")
      return !N;
    for (const k in N)
      if (I.RULES.all[k])
        return !0;
    return !1;
  }
  function T(N) {
    return typeof N.schema != "boolean";
  }
  function K(N, I) {
    const { schema: k, gen: D, opts: G } = N;
    G.$comment && k.$comment && W(N), q(N), X(N);
    const Q = D.const("_errs", c.default.errors);
    ie(N, Q), D.var(I, (0, l._)`${Q} === ${c.default.errors}`);
  }
  function J(N) {
    (0, u.checkUnknownRules)(N), de(N);
  }
  function ie(N, I) {
    if (N.opts.jtd)
      return ve(N, [], !1, I);
    const k = (0, t.getSchemaTypes)(N.schema), D = (0, t.coerceAndCheckDataType)(N, k);
    ve(N, k, !D, I);
  }
  function de(N) {
    const { schema: I, errSchemaPath: k, opts: D, self: G } = N;
    I.$ref && D.ignoreKeywordsWithRef && (0, u.schemaHasRulesButRef)(I, G.RULES) && G.logger.warn(`$ref: keywords ignored in schema at path "${k}"`);
  }
  function pe(N) {
    const { schema: I, opts: k } = N;
    I.default !== void 0 && k.useDefaults && k.strictSchema && (0, u.checkStrictMode)(N, "default is ignored in the schema root");
  }
  function q(N) {
    const I = N.schema[N.opts.schemaId];
    I && (N.baseId = (0, d.resolveUrl)(N.opts.uriResolver, N.baseId, I));
  }
  function X(N) {
    if (N.schema.$async && !N.schemaEnv.$async)
      throw new Error("async schema in sync schema");
  }
  function W({ gen: N, schemaEnv: I, schema: k, errSchemaPath: D, opts: G }) {
    const Q = k.$comment;
    if (G.$comment === !0)
      N.code((0, l._)`${c.default.self}.logger.log(${Q})`);
    else if (typeof G.$comment == "function") {
      const $e = (0, l.str)`${D}/$comment`, Ve = N.scopeValue("root", { ref: I.root });
      N.code((0, l._)`${c.default.self}.opts.$comment(${Q}, ${$e}, ${Ve}.schema)`);
    }
  }
  function H(N) {
    const { gen: I, schemaEnv: k, validateName: D, ValidationError: G, opts: Q } = N;
    k.$async ? I.if((0, l._)`${c.default.errors} === 0`, () => I.return(c.default.data), () => I.throw((0, l._)`new ${G}(${c.default.vErrors})`)) : (I.assign((0, l._)`${D}.errors`, c.default.vErrors), Q.unevaluated && ce(N), I.return((0, l._)`${c.default.errors} === 0`));
  }
  function ce({ gen: N, evaluated: I, props: k, items: D }) {
    k instanceof l.Name && N.assign((0, l._)`${I}.props`, k), D instanceof l.Name && N.assign((0, l._)`${I}.items`, D);
  }
  function ve(N, I, k, D) {
    const { gen: G, schema: Q, data: $e, allErrors: Ve, opts: be, self: Se } = N, { RULES: ye } = Se;
    if (Q.$ref && (be.ignoreKeywordsWithRef || !(0, u.schemaHasRulesButRef)(Q, ye))) {
      G.block(() => j(N, "$ref", ye.all.$ref.definition));
      return;
    }
    be.jtd || C(N, I), G.block(() => {
      for (const Te of ye.rules)
        ct(Te);
      ct(ye.post);
    });
    function ct(Te) {
      (0, r.shouldUseGroup)(Q, Te) && (Te.type ? (G.if((0, n.checkDataType)(Te.type, $e, be.strictNumbers)), M(N, Te), I.length === 1 && I[0] === Te.type && k && (G.else(), (0, n.reportTypeError)(N)), G.endIf()) : M(N, Te), Ve || G.if((0, l._)`${c.default.errors} === ${D || 0}`));
    }
  }
  function M(N, I) {
    const { gen: k, schema: D, opts: { useDefaults: G } } = N;
    G && (0, s.assignDefaults)(N, I.type), k.block(() => {
      for (const Q of I.rules)
        (0, r.shouldUseRule)(D, Q) && j(N, Q.keyword, Q.definition, I.type);
    });
  }
  function C(N, I) {
    N.schemaEnv.meta || !N.opts.strictTypes || (z(N, I), N.opts.allowUnionTypes || P(N, I), p(N, N.dataTypes));
  }
  function z(N, I) {
    if (I.length) {
      if (!N.dataTypes.length) {
        N.dataTypes = I;
        return;
      }
      I.forEach((k) => {
        $(N.dataTypes, k) || f(N, `type "${k}" not allowed by context "${N.dataTypes.join(",")}"`);
      }), i(N, I);
    }
  }
  function P(N, I) {
    I.length > 1 && !(I.length === 2 && I.includes("null")) && f(N, "use allowUnionTypes to allow union type keyword");
  }
  function p(N, I) {
    const k = N.self.RULES.all;
    for (const D in k) {
      const G = k[D];
      if (typeof G == "object" && (0, r.shouldUseRule)(N.schema, G)) {
        const { type: Q } = G.definition;
        Q.length && !Q.some(($e) => S(I, $e)) && f(N, `missing type "${Q.join(",")}" for keyword "${D}"`);
      }
    }
  }
  function S(N, I) {
    return N.includes(I) || I === "number" && N.includes("integer");
  }
  function $(N, I) {
    return N.includes(I) || I === "integer" && N.includes("number");
  }
  function i(N, I) {
    const k = [];
    for (const D of N.dataTypes)
      $(I, D) ? k.push(D) : I.includes("integer") && D === "number" && k.push("integer");
    N.dataTypes = k;
  }
  function f(N, I) {
    const k = N.schemaEnv.baseId + N.errSchemaPath;
    I += ` at "${k}" (strictTypes)`, (0, u.checkStrictMode)(N, I, N.opts.strictTypes);
  }
  class b {
    constructor(I, k, D) {
      if ((0, a.validateKeywordUsage)(I, k, D), this.gen = I.gen, this.allErrors = I.allErrors, this.keyword = D, this.data = I.data, this.schema = I.schema[D], this.$data = k.$data && I.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, u.schemaRefOrVal)(I, this.schema, D, this.$data), this.schemaType = k.schemaType, this.parentSchema = I.schema, this.params = {}, this.it = I, this.def = k, this.$data)
        this.schemaCode = I.gen.const("vSchema", U(this.$data, I));
      else if (this.schemaCode = this.schemaValue, !(0, a.validSchemaType)(this.schema, k.schemaType, k.allowUndefined))
        throw new Error(`${D} value must be ${JSON.stringify(k.schemaType)}`);
      ("code" in k ? k.trackErrors : k.errors !== !1) && (this.errsCount = I.gen.const("_errs", c.default.errors));
    }
    result(I, k, D) {
      this.failResult((0, l.not)(I), k, D);
    }
    failResult(I, k, D) {
      this.gen.if(I), D ? D() : this.error(), k ? (this.gen.else(), k(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
    }
    pass(I, k) {
      this.failResult((0, l.not)(I), void 0, k);
    }
    fail(I) {
      if (I === void 0) {
        this.error(), this.allErrors || this.gen.if(!1);
        return;
      }
      this.gen.if(I), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
    }
    fail$data(I) {
      if (!this.$data)
        return this.fail(I);
      const { schemaCode: k } = this;
      this.fail((0, l._)`${k} !== undefined && (${(0, l.or)(this.invalid$data(), I)})`);
    }
    error(I, k, D) {
      if (k) {
        this.setParams(k), this._error(I, D), this.setParams({});
        return;
      }
      this._error(I, D);
    }
    _error(I, k) {
      (I ? h.reportExtraError : h.reportError)(this, this.def.error, k);
    }
    $dataError() {
      (0, h.reportError)(this, this.def.$dataError || h.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0)
        throw new Error('add "trackErrors" to keyword definition');
      (0, h.resetErrorsCount)(this.gen, this.errsCount);
    }
    ok(I) {
      this.allErrors || this.gen.if(I);
    }
    setParams(I, k) {
      k ? Object.assign(this.params, I) : this.params = I;
    }
    block$data(I, k, D = l.nil) {
      this.gen.block(() => {
        this.check$data(I, D), k();
      });
    }
    check$data(I = l.nil, k = l.nil) {
      if (!this.$data)
        return;
      const { gen: D, schemaCode: G, schemaType: Q, def: $e } = this;
      D.if((0, l.or)((0, l._)`${G} === undefined`, k)), I !== l.nil && D.assign(I, !0), (Q.length || $e.validateSchema) && (D.elseIf(this.invalid$data()), this.$dataError(), I !== l.nil && D.assign(I, !1)), D.else();
    }
    invalid$data() {
      const { gen: I, schemaCode: k, schemaType: D, def: G, it: Q } = this;
      return (0, l.or)($e(), Ve());
      function $e() {
        if (D.length) {
          if (!(k instanceof l.Name))
            throw new Error("ajv implementation error");
          const be = Array.isArray(D) ? D : [D];
          return (0, l._)`${(0, n.checkDataTypes)(be, k, Q.opts.strictNumbers, n.DataType.Wrong)}`;
        }
        return l.nil;
      }
      function Ve() {
        if (G.validateSchema) {
          const be = I.scopeValue("validate$data", { ref: G.validateSchema });
          return (0, l._)`!${be}(${k})`;
        }
        return l.nil;
      }
    }
    subschema(I, k) {
      const D = (0, o.getSubschema)(this.it, I);
      (0, o.extendSubschemaData)(D, this.it, I), (0, o.extendSubschemaMode)(D, I);
      const G = { ...this.it, ...D, items: void 0, props: void 0 };
      return R(G, k), G;
    }
    mergeEvaluated(I, k) {
      const { it: D, gen: G } = this;
      D.opts.unevaluated && (D.props !== !0 && I.props !== void 0 && (D.props = u.mergeEvaluated.props(G, I.props, D.props, k)), D.items !== !0 && I.items !== void 0 && (D.items = u.mergeEvaluated.items(G, I.items, D.items, k)));
    }
    mergeValidEvaluated(I, k) {
      const { it: D, gen: G } = this;
      if (D.opts.unevaluated && (D.props !== !0 || D.items !== !0))
        return G.if(k, () => this.mergeEvaluated(I, l.Name)), !0;
    }
  }
  yt.KeywordCxt = b;
  function j(N, I, k, D) {
    const G = new b(N, k, I);
    "code" in k ? k.code(G, D) : G.$data && k.validate ? (0, a.funcKeywordCode)(G, k) : "macro" in k ? (0, a.macroKeywordCode)(G, k) : (k.compile || k.validate) && (0, a.funcKeywordCode)(G, k);
  }
  const A = /^\/(?:[^~]|~0|~1)*$/, F = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function U(N, { dataLevel: I, dataNames: k, dataPathArr: D }) {
    let G, Q;
    if (N === "")
      return c.default.rootData;
    if (N[0] === "/") {
      if (!A.test(N))
        throw new Error(`Invalid JSON-pointer: ${N}`);
      G = N, Q = c.default.rootData;
    } else {
      const Se = F.exec(N);
      if (!Se)
        throw new Error(`Invalid JSON-pointer: ${N}`);
      const ye = +Se[1];
      if (G = Se[2], G === "#") {
        if (ye >= I)
          throw new Error(be("property/index", ye));
        return D[I - ye];
      }
      if (ye > I)
        throw new Error(be("data", ye));
      if (Q = k[I - ye], !G)
        return Q;
    }
    let $e = Q;
    const Ve = G.split("/");
    for (const Se of Ve)
      Se && (Q = (0, l._)`${Q}${(0, l.getProperty)((0, u.unescapeJsonPointer)(Se))}`, $e = (0, l._)`${$e} && ${Q}`);
    return $e;
    function be(Se, ye) {
      return `Cannot access ${Se} ${ye} levels up, current level is ${I}`;
    }
  }
  return yt.getData = U, yt;
}
var rn = {};
Object.defineProperty(rn, "__esModule", { value: !0 });
class $f extends Error {
  constructor(t) {
    super("validation failed"), this.errors = t, this.ajv = this.validation = !0;
  }
}
rn.default = $f;
var Nr = {};
Object.defineProperty(Nr, "__esModule", { value: !0 });
const ws = Oe;
class yf extends Error {
  constructor(t, r, n, s) {
    super(s || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, ws.resolveUrl)(t, r, n), this.missingSchema = (0, ws.normalizeId)((0, ws.getFullPath)(t, this.missingRef));
  }
}
Nr.default = yf;
var Fe = {};
Object.defineProperty(Fe, "__esModule", { value: !0 });
Fe.resolveSchema = Fe.getCompilingSchema = Fe.resolveRef = Fe.compileSchema = Fe.SchemaEnv = void 0;
const Ze = ee, gf = rn, Gt = at(), rt = Oe, bi = V, _f = xn();
let es = class {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, rt.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
};
Fe.SchemaEnv = es;
function ya(e) {
  const t = dl.call(this, e);
  if (t)
    return t;
  const r = (0, rt.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new Ze.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let l;
  e.$async && (l = o.scopeValue("Error", {
    ref: gf.default,
    code: (0, Ze._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = o.scopeName("validate");
  e.validateName = c;
  const d = {
    gen: o,
    allErrors: this.opts.allErrors,
    data: Gt.default.data,
    parentData: Gt.default.parentData,
    parentDataProperty: Gt.default.parentDataProperty,
    dataNames: [Gt.default.data],
    dataPathArr: [Ze.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: o.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, Ze.stringify)(e.schema) } : { ref: e.schema }),
    validateName: c,
    ValidationError: l,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: Ze.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, Ze._)`""`,
    opts: this.opts,
    self: this
  };
  let u;
  try {
    this._compilations.add(e), (0, _f.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    u = `${o.scopeRefs(Gt.default.scope)}return ${h}`, this.opts.code.process && (u = this.opts.code.process(u, e));
    const y = new Function(`${Gt.default.self}`, `${Gt.default.scope}`, u)(this, this.scope.get());
    if (this.scope.value(c, { ref: y }), y.errors = null, y.schema = e.schema, y.schemaEnv = e, e.$async && (y.$async = !0), this.opts.code.source === !0 && (y.source = { validateName: c, validateCode: h, scopeValues: o._values }), this.opts.unevaluated) {
      const { props: v, items: _ } = d;
      y.evaluated = {
        props: v instanceof Ze.Name ? void 0 : v,
        items: _ instanceof Ze.Name ? void 0 : _,
        dynamicProps: v instanceof Ze.Name,
        dynamicItems: _ instanceof Ze.Name
      }, y.source && (y.source.evaluated = (0, Ze.stringify)(y.evaluated));
    }
    return e.validate = y, e;
  } catch (h) {
    throw delete e.validate, delete e.validateName, u && this.logger.error("Error compiling schema, function code:", u), h;
  } finally {
    this._compilations.delete(e);
  }
}
Fe.compileSchema = ya;
function vf(e, t, r) {
  var n;
  r = (0, rt.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = bf.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: l } = this.opts;
    o && (a = new es({ schema: o, schemaId: l, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = wf.call(this, a);
}
Fe.resolveRef = vf;
function wf(e) {
  return (0, rt.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : ya.call(this, e);
}
function dl(e) {
  for (const t of this._compilations)
    if (Ef(t, e))
      return t;
}
Fe.getCompilingSchema = dl;
function Ef(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function bf(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || ts.call(this, e, t);
}
function ts(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, rt._getFullPath)(this.opts.uriResolver, r);
  let s = (0, rt.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return Es.call(this, r, e);
  const a = (0, rt.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const l = ts.call(this, e, o);
    return typeof (l == null ? void 0 : l.schema) != "object" ? void 0 : Es.call(this, r, l);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || ya.call(this, o), a === (0, rt.normalizeId)(t)) {
      const { schema: l } = o, { schemaId: c } = this.opts, d = l[c];
      return d && (s = (0, rt.resolveUrl)(this.opts.uriResolver, s, d)), new es({ schema: l, schemaId: c, root: e, baseId: s });
    }
    return Es.call(this, r, o);
  }
}
Fe.resolveSchema = ts;
const Sf = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function Es(e, { baseId: t, schema: r, root: n }) {
  var s;
  if (((s = e.fragment) === null || s === void 0 ? void 0 : s[0]) !== "/")
    return;
  for (const l of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, bi.unescapeFragment)(l)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !Sf.has(l) && d && (t = (0, rt.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, bi.schemaHasRulesButRef)(r, this.RULES)) {
    const l = (0, rt.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = ts.call(this, n, l);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new es({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const Pf = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", Nf = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Rf = "object", Of = [
  "$data"
], If = {
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
}, Tf = !1, jf = {
  $id: Pf,
  description: Nf,
  type: Rf,
  required: Of,
  properties: If,
  additionalProperties: Tf
};
var ga = {}, rs = { exports: {} };
const Af = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu), fl = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u), _a = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu), hl = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu), kf = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
function ml(e) {
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
const Cf = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
function Si(e) {
  return e.length = 0, !0;
}
function Df(e, t, r) {
  if (e.length) {
    const n = ml(e);
    if (n !== "")
      t.push(n);
    else
      return r.error = !0, !1;
    e.length = 0;
  }
  return !0;
}
function Mf(e) {
  let t = 0;
  const r = { error: !1, address: "", zone: "" }, n = [], s = [];
  let a = !1, o = !1, l = Df;
  for (let c = 0; c < e.length; c++) {
    const d = e[c];
    if (!(d === "[" || d === "]"))
      if (d === ":") {
        if (a === !0 && (o = !0), !l(s, n, r))
          break;
        if (++t > 7) {
          r.error = !0;
          break;
        }
        c > 0 && e[c - 1] === ":" && (a = !0), n.push(":");
        continue;
      } else if (d === "%") {
        if (!l(s, n, r))
          break;
        l = Si;
      } else {
        s.push(d);
        continue;
      }
  }
  return s.length && (l === Si ? r.zone = s.join("") : o ? n.push(s.join("")) : n.push(ml(s))), r.address = n.join(""), r;
}
function pl(e) {
  if (Vf(e, ":") < 2)
    return { host: e, isIPV6: !1 };
  const t = Mf(e);
  if (t.error)
    return { host: e, isIPV6: !1 };
  {
    let r = t.address, n = t.address;
    return t.zone && (r += "%" + t.zone, n += "%25" + t.zone), { host: r, isIPV6: !0, escapedHost: n };
  }
}
function Vf(e, t) {
  let r = 0;
  for (let n = 0; n < e.length; n++)
    e[n] === t && r++;
  return r;
}
function Lf(e) {
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
const Ff = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" }, zf = /[@/?#:]/g, Uf = /[@/?#]/g;
function $l(e, t) {
  const r = t ? Uf : zf;
  return r.lastIndex = 0, e.replace(r, (n) => Ff[n]);
}
function qf(e, t = !1) {
  if (e.indexOf("%") === -1)
    return e;
  let r = "";
  for (let n = 0; n < e.length; n++) {
    if (e[n] === "%" && n + 2 < e.length) {
      const s = e.slice(n + 1, n + 3);
      if (_a(s)) {
        const a = s.toUpperCase(), o = String.fromCharCode(parseInt(a, 16));
        t && hl(o) ? r += o : r += "%" + a, n += 2;
        continue;
      }
    }
    r += e[n];
  }
  return r;
}
function Kf(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (_a(n)) {
        const s = n.toUpperCase(), a = String.fromCharCode(parseInt(s, 16));
        a !== "." && hl(a) ? t += a : t += "%" + s, r += 2;
        continue;
      }
    }
    kf(e[r]) ? t += e[r] : t += escape(e[r]);
  }
  return t;
}
function Gf(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (_a(n)) {
        t += "%" + n.toUpperCase(), r += 2;
        continue;
      }
    }
    t += escape(e[r]);
  }
  return t;
}
function Hf(e) {
  const t = [];
  if (e.userinfo !== void 0 && (t.push(e.userinfo), t.push("@")), e.host !== void 0) {
    let r = unescape(e.host);
    if (!fl(r)) {
      const n = pl(r);
      n.isIPV6 === !0 ? r = `[${n.escapedHost}]` : r = $l(r, !1);
    }
    t.push(r);
  }
  return (typeof e.port == "number" || typeof e.port == "string") && (t.push(":"), t.push(String(e.port))), t.length ? t.join("") : void 0;
}
var yl = {
  nonSimpleDomain: Cf,
  recomposeAuthority: Hf,
  reescapeHostDelimiters: $l,
  normalizePercentEncoding: qf,
  normalizePathEncoding: Kf,
  escapePreservingEscapes: Gf,
  removeDotSegments: Lf,
  isIPv4: fl,
  isUUID: Af,
  normalizeIPv6: pl
};
const { isUUID: Bf } = yl, Xf = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function gl(e) {
  return e.secure === !0 ? !0 : e.secure === !1 ? !1 : e.scheme ? e.scheme.length === 3 && (e.scheme[0] === "w" || e.scheme[0] === "W") && (e.scheme[1] === "s" || e.scheme[1] === "S") && (e.scheme[2] === "s" || e.scheme[2] === "S") : !1;
}
function _l(e) {
  return e.host || (e.error = e.error || "HTTP URIs must have a host."), e;
}
function vl(e) {
  const t = String(e.scheme).toLowerCase() === "https";
  return (e.port === (t ? 443 : 80) || e.port === "") && (e.port = void 0), e.path || (e.path = "/"), e;
}
function Jf(e) {
  return e.secure = gl(e), e.resourceName = (e.path || "/") + (e.query ? "?" + e.query : ""), e.path = void 0, e.query = void 0, e;
}
function Wf(e) {
  if ((e.port === (gl(e) ? 443 : 80) || e.port === "") && (e.port = void 0), typeof e.secure == "boolean" && (e.scheme = e.secure ? "wss" : "ws", e.secure = void 0), e.resourceName) {
    const [t, r] = e.resourceName.split("?");
    e.path = t && t !== "/" ? t : void 0, e.query = r, e.resourceName = void 0;
  }
  return e.fragment = void 0, e;
}
function Yf(e, t) {
  if (!e.path)
    return e.error = "URN can not be parsed", e;
  const r = e.path.match(Xf);
  if (r) {
    const n = t.scheme || e.scheme || "urn";
    e.nid = r[1].toLowerCase(), e.nss = r[2];
    const s = `${n}:${t.nid || e.nid}`, a = va(s);
    e.path = void 0, a && (e = a.parse(e, t));
  } else
    e.error = e.error || "URN can not be parsed.";
  return e;
}
function Qf(e, t) {
  if (e.nid === void 0)
    throw new Error("URN without nid cannot be serialized");
  const r = t.scheme || e.scheme || "urn", n = e.nid.toLowerCase(), s = `${r}:${t.nid || n}`, a = va(s);
  a && (e = a.serialize(e, t));
  const o = e, l = e.nss;
  return o.path = `${n || t.nid}:${l}`, t.skipEscape = !0, o;
}
function Zf(e, t) {
  const r = e;
  return r.uuid = r.nss, r.nss = void 0, !t.tolerant && (!r.uuid || !Bf(r.uuid)) && (r.error = r.error || "UUID is not valid."), r;
}
function xf(e) {
  const t = e;
  return t.nss = (e.uuid || "").toLowerCase(), t;
}
const wl = (
  /** @type {SchemeHandler} */
  {
    scheme: "http",
    domainHost: !0,
    parse: _l,
    serialize: vl
  }
), eh = (
  /** @type {SchemeHandler} */
  {
    scheme: "https",
    domainHost: wl.domainHost,
    parse: _l,
    serialize: vl
  }
), kn = (
  /** @type {SchemeHandler} */
  {
    scheme: "ws",
    domainHost: !0,
    parse: Jf,
    serialize: Wf
  }
), th = (
  /** @type {SchemeHandler} */
  {
    scheme: "wss",
    domainHost: kn.domainHost,
    parse: kn.parse,
    serialize: kn.serialize
  }
), rh = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn",
    parse: Yf,
    serialize: Qf,
    skipNormalize: !0
  }
), nh = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn:uuid",
    parse: Zf,
    serialize: xf,
    skipNormalize: !0
  }
), Kn = (
  /** @type {Record<SchemeName, SchemeHandler>} */
  {
    http: wl,
    https: eh,
    ws: kn,
    wss: th,
    urn: rh,
    "urn:uuid": nh
  }
);
Object.setPrototypeOf(Kn, null);
function va(e) {
  return e && (Kn[
    /** @type {SchemeName} */
    e
  ] || Kn[
    /** @type {SchemeName} */
    e.toLowerCase()
  ]) || void 0;
}
var sh = {
  SCHEMES: Kn,
  getSchemeHandler: va
};
const { normalizeIPv6: ah, removeDotSegments: Ur, recomposeAuthority: oh, normalizePercentEncoding: ih, normalizePathEncoding: ch, escapePreservingEscapes: lh, reescapeHostDelimiters: uh, isIPv4: dh, nonSimpleDomain: fh } = yl, { SCHEMES: hh, getSchemeHandler: El } = sh;
function mh(e, t) {
  return typeof e == "string" ? e = /** @type {T} */
  _h(e, t) : typeof e == "object" && (e = /** @type {T} */
  Er(nr(e, t), t)), e;
}
function ph(e, t, r) {
  const n = r ? Object.assign({ scheme: "null" }, r) : { scheme: "null" }, s = bl(Er(e, n), Er(t, n), n, !0);
  return n.skipEscape = !0, nr(s, n);
}
function bl(e, t, r, n) {
  const s = {};
  return n || (e = Er(nr(e, r), r), t = Er(nr(t, r), r)), r = r || {}, !r.tolerant && t.scheme ? (s.scheme = t.scheme, s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = Ur(t.path || ""), s.query = t.query) : (t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0 ? (s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = Ur(t.path || ""), s.query = t.query) : (t.path ? (t.path[0] === "/" ? s.path = Ur(t.path) : ((e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0) && !e.path ? s.path = "/" + t.path : e.path ? s.path = e.path.slice(0, e.path.lastIndexOf("/") + 1) + t.path : s.path = t.path, s.path = Ur(s.path)), s.query = t.query) : (s.path = e.path, t.query !== void 0 ? s.query = t.query : s.query = e.query), s.userinfo = e.userinfo, s.host = e.host, s.port = e.port), s.scheme = e.scheme), s.fragment = t.fragment, s;
}
function $h(e, t, r) {
  const n = Pi(e, r), s = Pi(t, r);
  return n !== void 0 && s !== void 0 && n.toLowerCase() === s.toLowerCase();
}
function nr(e, t) {
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
  }, n = Object.assign({}, t), s = [], a = El(n.scheme || r.scheme);
  a && a.serialize && a.serialize(r, n), r.path !== void 0 && (n.skipEscape ? r.path = ih(r.path) : (r.path = lh(r.path), r.scheme !== void 0 && (r.path = r.path.split("%3A").join(":")))), n.reference !== "suffix" && r.scheme && s.push(r.scheme, ":");
  const o = oh(r);
  if (o !== void 0 && (n.reference !== "suffix" && s.push("//"), s.push(o), r.path && r.path[0] !== "/" && s.push("/")), r.path !== void 0) {
    let l = r.path;
    !n.absolutePath && (!a || !a.absolutePath) && (l = Ur(l)), o === void 0 && l[0] === "/" && l[1] === "/" && (l = "/%2F" + l.slice(2)), s.push(l);
  }
  return r.query !== void 0 && s.push("?", r.query), r.fragment !== void 0 && s.push("#", r.fragment), s.join("");
}
const yh = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function gh(e, t) {
  if (t[2] !== void 0 && e.path && e.path[0] !== "/")
    return 'URI path must start with "/" when authority is present.';
  if (typeof e.port == "number" && (e.port < 0 || e.port > 65535))
    return "URI port is malformed.";
}
function Sl(e, t) {
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
  const o = e.match(yh);
  if (o) {
    n.scheme = o[1], n.userinfo = o[3], n.host = o[4], n.port = parseInt(o[5], 10), n.path = o[6] || "", n.query = o[7], n.fragment = o[8], isNaN(n.port) && (n.port = o[5]);
    const l = gh(n, o);
    if (l !== void 0 && (n.error = n.error || l, s = !0), n.host)
      if (dh(n.host) === !1) {
        const u = ah(n.host);
        n.host = u.host.toLowerCase(), a = u.isIPV6;
      } else
        a = !0;
    n.scheme === void 0 && n.userinfo === void 0 && n.host === void 0 && n.port === void 0 && n.query === void 0 && !n.path ? n.reference = "same-document" : n.scheme === void 0 ? n.reference = "relative" : n.fragment === void 0 ? n.reference = "absolute" : n.reference = "uri", r.reference && r.reference !== "suffix" && r.reference !== n.reference && (n.error = n.error || "URI is not a " + r.reference + " reference.");
    const c = El(r.scheme || n.scheme);
    if (!r.unicodeSupport && (!c || !c.unicodeSupport) && n.host && (r.domainHost || c && c.domainHost) && a === !1 && fh(n.host))
      try {
        n.host = new URL("http://" + n.host).hostname;
      } catch (d) {
        n.error = n.error || "Host's domain name can not be converted to ASCII: " + d;
      }
    if ((!c || c && !c.skipNormalize) && (e.indexOf("%") !== -1 && (n.scheme !== void 0 && (n.scheme = unescape(n.scheme)), n.host !== void 0 && (n.host = uh(unescape(n.host), a))), n.path && (n.path = ch(n.path)), n.fragment))
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
function Er(e, t) {
  return Sl(e, t).parsed;
}
function _h(e, t) {
  return Pl(e, t).normalized;
}
function Pl(e, t) {
  const { parsed: r, malformedAuthorityOrPort: n } = Sl(e, t);
  return {
    normalized: n ? e : nr(r, t),
    malformedAuthorityOrPort: n
  };
}
function Pi(e, t) {
  if (typeof e == "string") {
    const { normalized: r, malformedAuthorityOrPort: n } = Pl(e, t);
    return n ? void 0 : r;
  }
  if (typeof e == "object")
    return nr(e, t);
}
const wa = {
  SCHEMES: hh,
  normalize: mh,
  resolve: ph,
  resolveComponent: bl,
  equal: $h,
  serialize: nr,
  parse: Er
};
rs.exports = wa;
rs.exports.default = wa;
rs.exports.fastUri = wa;
var Nl = rs.exports;
Object.defineProperty(ga, "__esModule", { value: !0 });
const Rl = Nl;
Rl.code = 'require("ajv/dist/runtime/uri").default';
ga.default = Rl;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = xn();
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return t.KeywordCxt;
  } });
  var r = ee;
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
  const n = rn, s = Nr, a = rr, o = Fe, l = ee, c = Oe, d = we, u = V, h = jf, w = ga, y = (P, p) => new RegExp(P, p);
  y.code = "new RegExp";
  const v = ["removeAdditional", "useDefaults", "coerceTypes"], _ = /* @__PURE__ */ new Set([
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
  ]), g = {
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
  }, E = 200;
  function R(P) {
    var p, S, $, i, f, b, j, A, F, U, N, I, k, D, G, Q, $e, Ve, be, Se, ye, ct, Te, zt, Ut;
    const We = P.strict, qt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, kr = qt === !0 || qt === void 0 ? 1 : qt || 0, Cr = ($ = (S = P.code) === null || S === void 0 ? void 0 : S.regExp) !== null && $ !== void 0 ? $ : y, $s = (i = P.uriResolver) !== null && i !== void 0 ? i : w.default;
    return {
      strictSchema: (b = (f = P.strictSchema) !== null && f !== void 0 ? f : We) !== null && b !== void 0 ? b : !0,
      strictNumbers: (A = (j = P.strictNumbers) !== null && j !== void 0 ? j : We) !== null && A !== void 0 ? A : !0,
      strictTypes: (U = (F = P.strictTypes) !== null && F !== void 0 ? F : We) !== null && U !== void 0 ? U : "log",
      strictTuples: (I = (N = P.strictTuples) !== null && N !== void 0 ? N : We) !== null && I !== void 0 ? I : "log",
      strictRequired: (D = (k = P.strictRequired) !== null && k !== void 0 ? k : We) !== null && D !== void 0 ? D : !1,
      code: P.code ? { ...P.code, optimize: kr, regExp: Cr } : { optimize: kr, regExp: Cr },
      loopRequired: (G = P.loopRequired) !== null && G !== void 0 ? G : E,
      loopEnum: (Q = P.loopEnum) !== null && Q !== void 0 ? Q : E,
      meta: ($e = P.meta) !== null && $e !== void 0 ? $e : !0,
      messages: (Ve = P.messages) !== null && Ve !== void 0 ? Ve : !0,
      inlineRefs: (be = P.inlineRefs) !== null && be !== void 0 ? be : !0,
      schemaId: (Se = P.schemaId) !== null && Se !== void 0 ? Se : "$id",
      addUsedSchema: (ye = P.addUsedSchema) !== null && ye !== void 0 ? ye : !0,
      validateSchema: (ct = P.validateSchema) !== null && ct !== void 0 ? ct : !0,
      validateFormats: (Te = P.validateFormats) !== null && Te !== void 0 ? Te : !0,
      unicodeRegExp: (zt = P.unicodeRegExp) !== null && zt !== void 0 ? zt : !0,
      int32range: (Ut = P.int32range) !== null && Ut !== void 0 ? Ut : !0,
      uriResolver: $s
    };
  }
  class O {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = /* @__PURE__ */ Object.create(null), this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...R(p) };
      const { es5: S, lines: $ } = this.opts.code;
      this.scope = new l.ValueScope({ scope: {}, prefixes: _, es5: S, lines: $ }), this.logger = X(p.logger);
      const i = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, a.getRules)(), T.call(this, g, p, "NOT SUPPORTED"), T.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = pe.call(this), p.formats && ie.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && de.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), J.call(this), p.validateFormats = i;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: S, schemaId: $ } = this.opts;
      let i = h;
      $ === "id" && (i = { ...h }, i.id = i.$id, delete i.$id), S && p && this.addMetaSchema(i, i[$], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: S } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[S] || p : void 0;
    }
    validate(p, S) {
      let $;
      if (typeof p == "string") {
        if ($ = this.getSchema(p), !$)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        $ = this.compile(p);
      const i = $(S);
      return "$async" in $ || (this.errors = $.errors), i;
    }
    compile(p, S) {
      const $ = this._addSchema(p, S);
      return $.validate || this._compileSchemaEnv($);
    }
    compileAsync(p, S) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: $ } = this.opts;
      return i.call(this, p, S);
      async function i(U, N) {
        await f.call(this, U.$schema);
        const I = this._addSchema(U, N);
        return I.validate || b.call(this, I);
      }
      async function f(U) {
        U && !this.getSchema(U) && await i.call(this, { $ref: U }, !0);
      }
      async function b(U) {
        try {
          return this._compileSchemaEnv(U);
        } catch (N) {
          if (!(N instanceof s.default))
            throw N;
          return j.call(this, N), await A.call(this, N.missingSchema), b.call(this, U);
        }
      }
      function j({ missingSchema: U, missingRef: N }) {
        if (this.refs[U])
          throw new Error(`AnySchema ${U} is loaded but ${N} cannot be resolved`);
      }
      async function A(U) {
        const N = await F.call(this, U);
        this.refs[U] || await f.call(this, N.$schema), this.refs[U] || this.addSchema(N, U, S);
      }
      async function F(U) {
        const N = this._loading[U];
        if (N)
          return N;
        try {
          return await (this._loading[U] = $(U));
        } finally {
          delete this._loading[U];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, S, $, i = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const b of p)
          this.addSchema(b, void 0, $, i);
        return this;
      }
      let f;
      if (typeof p == "object") {
        const { schemaId: b } = this.opts;
        if (f = p[b], f !== void 0 && typeof f != "string")
          throw new Error(`schema ${b} must be string`);
      }
      return S = (0, c.normalizeId)(S || f), this._checkUnique(S), this.schemas[S] = this._addSchema(p, $, S, i, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, S, $ = this.opts.validateSchema) {
      return this.addSchema(p, S, !0, $), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, S) {
      if (typeof p == "boolean")
        return !0;
      let $;
      if ($ = p.$schema, $ !== void 0 && typeof $ != "string")
        throw new Error("$schema must be a string");
      if ($ = $ || this.opts.defaultMeta || this.defaultMeta(), !$)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const i = this.validate($, p);
      if (!i && S) {
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
      let S;
      for (; typeof (S = K.call(this, p)) == "string"; )
        p = S;
      if (S === void 0) {
        const { schemaId: $ } = this.opts, i = new o.SchemaEnv({ schema: {}, schemaId: $ });
        if (S = o.resolveSchema.call(this, i, p), !S)
          return;
        this.refs[p] = S;
      }
      return S.validate || this._compileSchemaEnv(S);
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
          const S = K.call(this, p);
          return typeof S == "object" && this._cache.delete(S.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const S = p;
          this._cache.delete(S);
          let $ = p[this.opts.schemaId];
          return $ && ($ = (0, c.normalizeId)($), delete this.schemas[$], delete this.refs[$]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const S of p)
        this.addKeyword(S);
      return this;
    }
    addKeyword(p, S) {
      let $;
      if (typeof p == "string")
        $ = p, typeof S == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), S.keyword = $);
      else if (typeof p == "object" && S === void 0) {
        if (S = p, $ = S.keyword, Array.isArray($) && !$.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (H.call(this, $, S), !S)
        return (0, u.eachItem)($, (f) => ce.call(this, f)), this;
      M.call(this, S);
      const i = {
        ...S,
        type: (0, d.getJSONTypes)(S.type),
        schemaType: (0, d.getJSONTypes)(S.schemaType)
      };
      return (0, u.eachItem)($, i.type.length === 0 ? (f) => ce.call(this, f, i) : (f) => i.type.forEach((b) => ce.call(this, f, i, b))), this;
    }
    getKeyword(p) {
      const S = this.RULES.all[p];
      return typeof S == "object" ? S.definition : !!S;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: S } = this;
      delete S.keywords[p], delete S.all[p];
      for (const $ of S.rules) {
        const i = $.rules.findIndex((f) => f.keyword === p);
        i >= 0 && $.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, S) {
      return typeof S == "string" && (S = new RegExp(S)), this.formats[p] = S, this;
    }
    errorsText(p = this.errors, { separator: S = ", ", dataVar: $ = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((i) => `${$}${i.instancePath} ${i.message}`).reduce((i, f) => i + S + f);
    }
    $dataMetaSchema(p, S) {
      const $ = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const i of S) {
        const f = i.split("/").slice(1);
        let b = p;
        for (const j of f)
          b = b[j];
        for (const j in $) {
          const A = $[j];
          if (typeof A != "object")
            continue;
          const { $data: F } = A.definition, U = b[j];
          F && U && (b[j] = z(U));
        }
      }
      return p;
    }
    _removeAllSchemas(p, S) {
      for (const $ in p) {
        const i = p[$];
        (!S || S.test($)) && (typeof i == "string" ? delete p[$] : i && !i.meta && (this._cache.delete(i.schema), delete p[$]));
      }
    }
    _addSchema(p, S, $, i = this.opts.validateSchema, f = this.opts.addUsedSchema) {
      let b;
      const { schemaId: j } = this.opts;
      if (typeof p == "object")
        b = p[j];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let A = this._cache.get(p);
      if (A !== void 0)
        return A;
      $ = (0, c.normalizeId)(b || $);
      const F = c.getSchemaRefs.call(this, p, $);
      return A = new o.SchemaEnv({ schema: p, schemaId: j, meta: S, baseId: $, localRefs: F }), this._cache.set(A.schema, A), f && !$.startsWith("#") && ($ && this._checkUnique($), this.refs[$] = A), i && this.validateSchema(p, !0), A;
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
      const S = this.opts;
      this.opts = this._metaOpts;
      try {
        o.compileSchema.call(this, p);
      } finally {
        this.opts = S;
      }
    }
  }
  O.ValidationError = n.default, O.MissingRefError = s.default, e.default = O;
  function T(P, p, S, $ = "error") {
    for (const i in P) {
      const f = i;
      f in p && this.logger[$](`${S}: option ${i}. ${P[f]}`);
    }
  }
  function K(P) {
    return P = (0, c.normalizeId)(P), this.schemas[P] || this.refs[P];
  }
  function J() {
    const P = this.opts.schemas;
    if (P)
      if (Array.isArray(P))
        this.addSchema(P);
      else
        for (const p in P)
          this.addSchema(P[p], p);
  }
  function ie() {
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
      const S = P[p];
      S.keyword || (S.keyword = p), this.addKeyword(S);
    }
  }
  function pe() {
    const P = { ...this.opts };
    for (const p of v)
      delete P[p];
    return P;
  }
  const q = { log() {
  }, warn() {
  }, error() {
  } };
  function X(P) {
    if (P === !1)
      return q;
    if (P === void 0)
      return console;
    if (P.log && P.warn && P.error)
      return P;
    throw new Error("logger must implement log, warn and error methods");
  }
  const W = /^[a-z_$][a-z0-9_$:-]*$/i;
  function H(P, p) {
    const { RULES: S } = this;
    if ((0, u.eachItem)(P, ($) => {
      if (S.keywords[$])
        throw new Error(`Keyword ${$} is already defined`);
      if (!W.test($))
        throw new Error(`Keyword ${$} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function ce(P, p, S) {
    var $;
    const i = p == null ? void 0 : p.post;
    if (S && i)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: f } = this;
    let b = i ? f.post : f.rules.find(({ type: A }) => A === S);
    if (b || (b = { type: S, rules: [] }, f.rules.push(b)), f.keywords[P] = !0, !p)
      return;
    const j = {
      keyword: P,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? ve.call(this, b, j, p.before) : b.rules.push(j), f.all[P] = j, ($ = p.implements) === null || $ === void 0 || $.forEach((A) => this.addKeyword(A));
  }
  function ve(P, p, S) {
    const $ = P.rules.findIndex((i) => i.keyword === S);
    $ >= 0 ? P.rules.splice($, 0, p) : (P.rules.push(p), this.logger.warn(`rule ${S} is not defined`));
  }
  function M(P) {
    let { metaSchema: p } = P;
    p !== void 0 && (P.$data && this.opts.$data && (p = z(p)), P.validateSchema = this.compile(p, !0));
  }
  const C = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function z(P) {
    return { anyOf: [P, C] };
  }
})(Jc);
var Ea = {}, ba = {}, Sa = {};
Object.defineProperty(Sa, "__esModule", { value: !0 });
const vh = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
Sa.default = vh;
var bt = {};
Object.defineProperty(bt, "__esModule", { value: !0 });
bt.callRef = bt.getValidate = void 0;
const wh = Nr, Ni = ae, qe = ee, ir = at(), Ri = Fe, fn = V, Eh = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: l, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const u = Ri.resolveRef.call(c, d, s, r);
    if (u === void 0)
      throw new wh.default(n.opts.uriResolver, s, r);
    if (u instanceof Ri.SchemaEnv)
      return w(u);
    return y(u);
    function h() {
      if (a === d)
        return Cn(e, o, a, a.$async);
      const v = t.scopeValue("root", { ref: d });
      return Cn(e, (0, qe._)`${v}.validate`, d, d.$async);
    }
    function w(v) {
      const _ = Ol(e, v);
      Cn(e, _, v, v.$async);
    }
    function y(v) {
      const _ = t.scopeValue("schema", l.code.source === !0 ? { ref: v, code: (0, qe.stringify)(v) } : { ref: v }), g = t.name("valid"), m = e.subschema({
        schema: v,
        dataTypes: [],
        schemaPath: qe.nil,
        topSchemaRef: _,
        errSchemaPath: r
      }, g);
      e.mergeEvaluated(m), e.ok(g);
    }
  }
};
function Ol(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, qe._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
bt.getValidate = Ol;
function Cn(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: l, opts: c } = a, d = c.passContext ? ir.default.this : qe.nil;
  n ? u() : h();
  function u() {
    if (!l.$async)
      throw new Error("async schema referenced by sync schema");
    const v = s.let("valid");
    s.try(() => {
      s.code((0, qe._)`await ${(0, Ni.callValidateCode)(e, t, d)}`), y(t), o || s.assign(v, !0);
    }, (_) => {
      s.if((0, qe._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), w(_), o || s.assign(v, !1);
    }), e.ok(v);
  }
  function h() {
    e.result((0, Ni.callValidateCode)(e, t, d), () => y(t), () => w(t));
  }
  function w(v) {
    const _ = (0, qe._)`${v}.errors`;
    s.assign(ir.default.vErrors, (0, qe._)`${ir.default.vErrors} === null ? ${_} : ${ir.default.vErrors}.concat(${_})`), s.assign(ir.default.errors, (0, qe._)`${ir.default.vErrors}.length`);
  }
  function y(v) {
    var _;
    if (!a.opts.unevaluated)
      return;
    const g = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (a.props !== !0)
      if (g && !g.dynamicProps)
        g.props !== void 0 && (a.props = fn.mergeEvaluated.props(s, g.props, a.props));
      else {
        const m = s.var("props", (0, qe._)`${v}.evaluated.props`);
        a.props = fn.mergeEvaluated.props(s, m, a.props, qe.Name);
      }
    if (a.items !== !0)
      if (g && !g.dynamicItems)
        g.items !== void 0 && (a.items = fn.mergeEvaluated.items(s, g.items, a.items));
      else {
        const m = s.var("items", (0, qe._)`${v}.evaluated.items`);
        a.items = fn.mergeEvaluated.items(s, m, a.items, qe.Name);
      }
  }
}
bt.callRef = Cn;
bt.default = Eh;
Object.defineProperty(ba, "__esModule", { value: !0 });
const bh = Sa, Sh = bt, Ph = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  bh.default,
  Sh.default
];
ba.default = Ph;
var Pa = {}, Na = {};
Object.defineProperty(Na, "__esModule", { value: !0 });
const Gn = ee, Ot = Gn.operators, Hn = {
  maximum: { okStr: "<=", ok: Ot.LTE, fail: Ot.GT },
  minimum: { okStr: ">=", ok: Ot.GTE, fail: Ot.LT },
  exclusiveMaximum: { okStr: "<", ok: Ot.LT, fail: Ot.GTE },
  exclusiveMinimum: { okStr: ">", ok: Ot.GT, fail: Ot.LTE }
}, Nh = {
  message: ({ keyword: e, schemaCode: t }) => (0, Gn.str)`must be ${Hn[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, Gn._)`{comparison: ${Hn[e].okStr}, limit: ${t}}`
}, Rh = {
  keyword: Object.keys(Hn),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Nh,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, Gn._)`${r} ${Hn[t].fail} ${n} || isNaN(${r})`);
  }
};
Na.default = Rh;
var Ra = {};
Object.defineProperty(Ra, "__esModule", { value: !0 });
const Gr = ee, Oh = {
  message: ({ schemaCode: e }) => (0, Gr.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, Gr._)`{multipleOf: ${e}}`
}, Ih = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Oh,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), l = a ? (0, Gr._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, Gr._)`${o} !== parseInt(${o})`;
    e.fail$data((0, Gr._)`(${n} === 0 || (${o} = ${r}/${n}, ${l}))`);
  }
};
Ra.default = Ih;
var Oa = {}, Ia = {};
Object.defineProperty(Ia, "__esModule", { value: !0 });
function Il(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
Ia.default = Il;
Il.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(Oa, "__esModule", { value: !0 });
const Bt = ee, Th = V, jh = Ia, Ah = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, Bt.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, Bt._)`{limit: ${e}}`
}, kh = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: Ah,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? Bt.operators.GT : Bt.operators.LT, o = s.opts.unicode === !1 ? (0, Bt._)`${r}.length` : (0, Bt._)`${(0, Th.useFunc)(e.gen, jh.default)}(${r})`;
    e.fail$data((0, Bt._)`${o} ${a} ${n}`);
  }
};
Oa.default = kh;
var Ta = {};
Object.defineProperty(Ta, "__esModule", { value: !0 });
const Ch = ae, Dh = V, pr = ee, Mh = {
  message: ({ schemaCode: e }) => (0, pr.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, pr._)`{pattern: ${e}}`
}, Vh = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Mh,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, l = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, pr._)`new RegExp` : (0, Dh.useFunc)(t, c), u = t.let("valid");
      t.try(() => t.assign(u, (0, pr._)`${d}(${a}, ${l}).test(${r})`), () => t.assign(u, !1)), e.fail$data((0, pr._)`!${u}`);
    } else {
      const c = (0, Ch.usePattern)(e, s);
      e.fail$data((0, pr._)`!${c}.test(${r})`);
    }
  }
};
Ta.default = Vh;
var ja = {};
Object.defineProperty(ja, "__esModule", { value: !0 });
const Hr = ee, Lh = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, Hr.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, Hr._)`{limit: ${e}}`
}, Fh = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Lh,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? Hr.operators.GT : Hr.operators.LT;
    e.fail$data((0, Hr._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
ja.default = Fh;
var Aa = {};
Object.defineProperty(Aa, "__esModule", { value: !0 });
const Lr = ae, Br = ee, zh = V, Uh = {
  message: ({ params: { missingProperty: e } }) => (0, Br.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, Br._)`{missingProperty: ${e}}`
}, qh = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Uh,
  code(e) {
    const { gen: t, schema: r, schemaCode: n, data: s, $data: a, it: o } = e, { opts: l } = o;
    if (!a && r.length === 0)
      return;
    const c = r.length >= l.loopRequired;
    if (o.allErrors ? d() : u(), l.strictRequired) {
      const y = e.parentSchema.properties, { definedProperties: v } = e.it;
      for (const _ of r)
        if ((y == null ? void 0 : y[_]) === void 0 && !v.has(_)) {
          const g = o.schemaEnv.baseId + o.errSchemaPath, m = `required property "${_}" is not defined at "${g}" (strictRequired)`;
          (0, zh.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(Br.nil, h);
      else
        for (const y of r)
          (0, Lr.checkReportMissingProp)(e, y);
    }
    function u() {
      const y = t.let("missing");
      if (c || a) {
        const v = t.let("valid", !0);
        e.block$data(v, () => w(y, v)), e.ok(v);
      } else
        t.if((0, Lr.checkMissingProp)(e, r, y)), (0, Lr.reportMissingProp)(e, y), t.else();
    }
    function h() {
      t.forOf("prop", n, (y) => {
        e.setParams({ missingProperty: y }), t.if((0, Lr.noPropertyInData)(t, s, y, l.ownProperties), () => e.error());
      });
    }
    function w(y, v) {
      e.setParams({ missingProperty: y }), t.forOf(y, n, () => {
        t.assign(v, (0, Lr.propertyInData)(t, s, y, l.ownProperties)), t.if((0, Br.not)(v), () => {
          e.error(), t.break();
        });
      }, Br.nil);
    }
  }
};
Aa.default = qh;
var ka = {};
Object.defineProperty(ka, "__esModule", { value: !0 });
const Xr = ee, Kh = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, Xr.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, Xr._)`{limit: ${e}}`
}, Gh = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: Kh,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? Xr.operators.GT : Xr.operators.LT;
    e.fail$data((0, Xr._)`${r}.length ${s} ${n}`);
  }
};
ka.default = Gh;
var Ca = {}, nn = {};
Object.defineProperty(nn, "__esModule", { value: !0 });
const Tl = Zn;
Tl.code = 'require("ajv/dist/runtime/equal").default';
nn.default = Tl;
Object.defineProperty(Ca, "__esModule", { value: !0 });
const bs = we, Ne = ee, Hh = V, Bh = nn, Xh = {
  message: ({ params: { i: e, j: t } }) => (0, Ne.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, Ne._)`{i: ${e}, j: ${t}}`
}, Jh = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: Xh,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, parentSchema: a, schemaCode: o, it: l } = e;
    if (!n && !s)
      return;
    const c = t.let("valid"), d = a.items ? (0, bs.getSchemaTypes)(a.items) : [];
    e.block$data(c, u, (0, Ne._)`${o} === false`), e.ok(c);
    function u() {
      const v = t.let("i", (0, Ne._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: v, j: _ }), t.assign(c, !0), t.if((0, Ne._)`${v} > 1`, () => (h() ? w : y)(v, _));
    }
    function h() {
      return d.length > 0 && !d.some((v) => v === "object" || v === "array");
    }
    function w(v, _) {
      const g = t.name("item"), m = (0, bs.checkDataTypes)(d, g, l.opts.strictNumbers, bs.DataType.Wrong), E = t.const("indices", (0, Ne._)`{}`);
      t.for((0, Ne._)`;${v}--;`, () => {
        t.let(g, (0, Ne._)`${r}[${v}]`), t.if(m, (0, Ne._)`continue`), d.length > 1 && t.if((0, Ne._)`typeof ${g} == "string"`, (0, Ne._)`${g} += "_"`), t.if((0, Ne._)`typeof ${E}[${g}] == "number"`, () => {
          t.assign(_, (0, Ne._)`${E}[${g}]`), e.error(), t.assign(c, !1).break();
        }).code((0, Ne._)`${E}[${g}] = ${v}`);
      });
    }
    function y(v, _) {
      const g = (0, Hh.useFunc)(t, Bh.default), m = t.name("outer");
      t.label(m).for((0, Ne._)`;${v}--;`, () => t.for((0, Ne._)`${_} = ${v}; ${_}--;`, () => t.if((0, Ne._)`${g}(${r}[${v}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Ca.default = Jh;
var Da = {};
Object.defineProperty(Da, "__esModule", { value: !0 });
const Hs = ee, Wh = V, Yh = nn, Qh = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, Hs._)`{allowedValue: ${e}}`
}, Zh = {
  keyword: "const",
  $data: !0,
  error: Qh,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, Hs._)`!${(0, Wh.useFunc)(t, Yh.default)}(${r}, ${s})`) : e.fail((0, Hs._)`${a} !== ${r}`);
  }
};
Da.default = Zh;
var Ma = {};
Object.defineProperty(Ma, "__esModule", { value: !0 });
const qr = ee, xh = V, em = nn, tm = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, qr._)`{allowedValues: ${e}}`
}, rm = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: tm,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const l = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, xh.useFunc)(t, em.default));
    let u;
    if (l || n)
      u = t.let("valid"), e.block$data(u, h);
    else {
      if (!Array.isArray(s))
        throw new Error("ajv implementation error");
      const y = t.const("vSchema", a);
      u = (0, qr.or)(...s.map((v, _) => w(y, _)));
    }
    e.pass(u);
    function h() {
      t.assign(u, !1), t.forOf("v", a, (y) => t.if((0, qr._)`${d()}(${r}, ${y})`, () => t.assign(u, !0).break()));
    }
    function w(y, v) {
      const _ = s[v];
      return typeof _ == "object" && _ !== null ? (0, qr._)`${d()}(${r}, ${y}[${v}])` : (0, qr._)`${r} === ${_}`;
    }
  }
};
Ma.default = rm;
Object.defineProperty(Pa, "__esModule", { value: !0 });
const nm = Na, sm = Ra, am = Oa, om = Ta, im = ja, cm = Aa, lm = ka, um = Ca, dm = Da, fm = Ma, hm = [
  // number
  nm.default,
  sm.default,
  // string
  am.default,
  om.default,
  // object
  im.default,
  cm.default,
  // array
  lm.default,
  um.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  dm.default,
  fm.default
];
Pa.default = hm;
var Va = {}, Rr = {};
Object.defineProperty(Rr, "__esModule", { value: !0 });
Rr.validateAdditionalItems = void 0;
const Xt = ee, Bs = V, mm = {
  message: ({ params: { len: e } }) => (0, Xt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Xt._)`{limit: ${e}}`
}, pm = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: mm,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, Bs.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    jl(e, n);
  }
};
function jl(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const l = r.const("len", (0, Xt._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, Xt._)`${l} <= ${t.length}`);
  else if (typeof n == "object" && !(0, Bs.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, Xt._)`${l} <= ${t.length}`);
    r.if((0, Xt.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, l, (u) => {
      e.subschema({ keyword: a, dataProp: u, dataPropType: Bs.Type.Num }, d), o.allErrors || r.if((0, Xt.not)(d), () => r.break());
    });
  }
}
Rr.validateAdditionalItems = jl;
Rr.default = pm;
var La = {}, Or = {};
Object.defineProperty(Or, "__esModule", { value: !0 });
Or.validateTuple = void 0;
const Oi = ee, Dn = V, $m = ae, ym = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return Al(e, "additionalItems", t);
    r.items = !0, !(0, Dn.alwaysValidSchema)(r, t) && e.ok((0, $m.validateArray)(e));
  }
};
function Al(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: l } = e;
  u(s), l.opts.unevaluated && r.length && l.items !== !0 && (l.items = Dn.mergeEvaluated.items(n, r.length, l.items));
  const c = n.name("valid"), d = n.const("len", (0, Oi._)`${a}.length`);
  r.forEach((h, w) => {
    (0, Dn.alwaysValidSchema)(l, h) || (n.if((0, Oi._)`${d} > ${w}`, () => e.subschema({
      keyword: o,
      schemaProp: w,
      dataProp: w
    }, c)), e.ok(c));
  });
  function u(h) {
    const { opts: w, errSchemaPath: y } = l, v = r.length, _ = v === h.minItems && (v === h.maxItems || h[t] === !1);
    if (w.strictTuples && !_) {
      const g = `"${o}" is ${v}-tuple, but minItems or maxItems/${t} are not specified or different at path "${y}"`;
      (0, Dn.checkStrictMode)(l, g, w.strictTuples);
    }
  }
}
Or.validateTuple = Al;
Or.default = ym;
Object.defineProperty(La, "__esModule", { value: !0 });
const gm = Or, _m = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, gm.validateTuple)(e, "items")
};
La.default = _m;
var Fa = {};
Object.defineProperty(Fa, "__esModule", { value: !0 });
const Ii = ee, vm = V, wm = ae, Em = Rr, bm = {
  message: ({ params: { len: e } }) => (0, Ii.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Ii._)`{limit: ${e}}`
}, Sm = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: bm,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, vm.alwaysValidSchema)(n, t) && (s ? (0, Em.validateAdditionalItems)(e, s) : e.ok((0, wm.validateArray)(e)));
  }
};
Fa.default = Sm;
var za = {};
Object.defineProperty(za, "__esModule", { value: !0 });
const Xe = ee, hn = V, Pm = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Xe.str)`must contain at least ${e} valid item(s)` : (0, Xe.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Xe._)`{minContains: ${e}}` : (0, Xe._)`{minContains: ${e}, maxContains: ${t}}`
}, Nm = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: Pm,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, l;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, l = d) : o = 1;
    const u = t.const("len", (0, Xe._)`${s}.length`);
    if (e.setParams({ min: o, max: l }), l === void 0 && o === 0) {
      (0, hn.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (l !== void 0 && o > l) {
      (0, hn.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, hn.alwaysValidSchema)(a, r)) {
      let _ = (0, Xe._)`${u} >= ${o}`;
      l !== void 0 && (_ = (0, Xe._)`${_} && ${u} <= ${l}`), e.pass(_);
      return;
    }
    a.items = !0;
    const h = t.name("valid");
    l === void 0 && o === 1 ? y(h, () => t.if(h, () => t.break())) : o === 0 ? (t.let(h, !0), l !== void 0 && t.if((0, Xe._)`${s}.length > 0`, w)) : (t.let(h, !1), w()), e.result(h, () => e.reset());
    function w() {
      const _ = t.name("_valid"), g = t.let("count", 0);
      y(_, () => t.if(_, () => v(g)));
    }
    function y(_, g) {
      t.forRange("i", 0, u, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: hn.Type.Num,
          compositeRule: !0
        }, _), g();
      });
    }
    function v(_) {
      t.code((0, Xe._)`${_}++`), l === void 0 ? t.if((0, Xe._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, Xe._)`${_} > ${l}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, Xe._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
za.default = Nm;
var ns = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
  const t = ee, r = V, n = ae;
  e.error = {
    message: ({ params: { property: c, depsCount: d, deps: u } }) => {
      const h = d === 1 ? "property" : "properties";
      return (0, t.str)`must have ${h} ${u} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: u, missingProperty: h } }) => (0, t._)`{property: ${c},
    missingProperty: ${h},
    depsCount: ${d},
    deps: ${u}}`
    // TODO change to reference
  };
  const s = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: e.error,
    code(c) {
      const [d, u] = a(c);
      o(c, d), l(c, u);
    }
  };
  function a({ schema: c }) {
    const d = {}, u = {};
    for (const h in c) {
      if (h === "__proto__")
        continue;
      const w = Array.isArray(c[h]) ? d : u;
      w[h] = c[h];
    }
    return [d, u];
  }
  function o(c, d = c.schema) {
    const { gen: u, data: h, it: w } = c;
    if (Object.keys(d).length === 0)
      return;
    const y = u.let("missing");
    for (const v in d) {
      const _ = d[v];
      if (_.length === 0)
        continue;
      const g = (0, n.propertyInData)(u, h, v, w.opts.ownProperties);
      c.setParams({
        property: v,
        depsCount: _.length,
        deps: _.join(", ")
      }), w.allErrors ? u.if(g, () => {
        for (const m of _)
          (0, n.checkReportMissingProp)(c, m);
      }) : (u.if((0, t._)`${g} && (${(0, n.checkMissingProp)(c, _, y)})`), (0, n.reportMissingProp)(c, y), u.else());
    }
  }
  e.validatePropertyDeps = o;
  function l(c, d = c.schema) {
    const { gen: u, data: h, keyword: w, it: y } = c, v = u.name("valid");
    for (const _ in d)
      (0, r.alwaysValidSchema)(y, d[_]) || (u.if(
        (0, n.propertyInData)(u, h, _, y.opts.ownProperties),
        () => {
          const g = c.subschema({ keyword: w, schemaProp: _ }, v);
          c.mergeValidEvaluated(g, v);
        },
        () => u.var(v, !0)
        // TODO var
      ), c.ok(v));
  }
  e.validateSchemaDeps = l, e.default = s;
})(ns);
var Ua = {};
Object.defineProperty(Ua, "__esModule", { value: !0 });
const kl = ee, Rm = V, Om = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, kl._)`{propertyName: ${e.propertyName}}`
}, Im = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: Om,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, Rm.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, kl.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
Ua.default = Im;
var ss = {};
Object.defineProperty(ss, "__esModule", { value: !0 });
const mn = ae, et = ee, Tm = at(), pn = V, jm = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, et._)`{additionalProperty: ${e.additionalProperty}}`
}, Am = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: jm,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: l, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, pn.alwaysValidSchema)(o, r))
      return;
    const d = (0, mn.allSchemaProperties)(n.properties), u = (0, mn.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, et._)`${a} === ${Tm.default.errors}`);
    function h() {
      t.forIn("key", s, (g) => {
        !d.length && !u.length ? v(g) : t.if(w(g), () => v(g));
      });
    }
    function w(g) {
      let m;
      if (d.length > 8) {
        const E = (0, pn.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, mn.isOwnProperty)(t, E, g);
      } else d.length ? m = (0, et.or)(...d.map((E) => (0, et._)`${g} === ${E}`)) : m = et.nil;
      return u.length && (m = (0, et.or)(m, ...u.map((E) => (0, et._)`${(0, mn.usePattern)(e, E)}.test(${g})`))), (0, et.not)(m);
    }
    function y(g) {
      t.code((0, et._)`delete ${s}[${g}]`);
    }
    function v(g) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        y(g);
        return;
      }
      if (r === !1) {
        e.setParams({ additionalProperty: g }), e.error(), l || t.break();
        return;
      }
      if (typeof r == "object" && !(0, pn.alwaysValidSchema)(o, r)) {
        const m = t.name("valid");
        c.removeAdditional === "failing" ? (_(g, m, !1), t.if((0, et.not)(m), () => {
          e.reset(), y(g);
        })) : (_(g, m), l || t.if((0, et.not)(m), () => t.break()));
      }
    }
    function _(g, m, E) {
      const R = {
        keyword: "additionalProperties",
        dataProp: g,
        dataPropType: pn.Type.Str
      };
      E === !1 && Object.assign(R, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(R, m);
    }
  }
};
ss.default = Am;
var qa = {};
Object.defineProperty(qa, "__esModule", { value: !0 });
const km = xn(), Ti = ae, Ss = V, ji = ss, Cm = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && ji.default.code(new km.KeywordCxt(a, ji.default, "additionalProperties"));
    const o = (0, Ti.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = Ss.mergeEvaluated.props(t, (0, Ss.toHash)(o), a.props));
    const l = o.filter((h) => !(0, Ss.alwaysValidSchema)(a, r[h]));
    if (l.length === 0)
      return;
    const c = t.name("valid");
    for (const h of l)
      d(h) ? u(h) : (t.if((0, Ti.propertyInData)(t, s, h, a.opts.ownProperties)), u(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
    function d(h) {
      return a.opts.useDefaults && !a.compositeRule && r[h].default !== void 0;
    }
    function u(h) {
      e.subschema({
        keyword: "properties",
        schemaProp: h,
        dataProp: h
      }, c);
    }
  }
};
qa.default = Cm;
var Ka = {};
Object.defineProperty(Ka, "__esModule", { value: !0 });
const Ai = ae, $n = ee, ki = V, Ci = V, Dm = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, l = (0, Ai.allSchemaProperties)(r), c = l.filter((_) => (0, ki.alwaysValidSchema)(a, r[_]));
    if (l.length === 0 || c.length === l.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, u = t.name("valid");
    a.props !== !0 && !(a.props instanceof $n.Name) && (a.props = (0, Ci.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    w();
    function w() {
      for (const _ of l)
        d && y(_), a.allErrors ? v(_) : (t.var(u, !0), v(_), t.if(u));
    }
    function y(_) {
      for (const g in d)
        new RegExp(_).test(g) && (0, ki.checkStrictMode)(a, `property ${g} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function v(_) {
      t.forIn("key", n, (g) => {
        t.if((0, $n._)`${(0, Ai.usePattern)(e, _)}.test(${g})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: g,
            dataPropType: Ci.Type.Str
          }, u), a.opts.unevaluated && h !== !0 ? t.assign((0, $n._)`${h}[${g}]`, !0) : !m && !a.allErrors && t.if((0, $n.not)(u), () => t.break());
        });
      });
    }
  }
};
Ka.default = Dm;
var Ga = {};
Object.defineProperty(Ga, "__esModule", { value: !0 });
const Mm = V, Vm = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, Mm.alwaysValidSchema)(n, r)) {
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
Ga.default = Vm;
var Ha = {};
Object.defineProperty(Ha, "__esModule", { value: !0 });
const Lm = ae, Fm = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: Lm.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Ha.default = Fm;
var Ba = {};
Object.defineProperty(Ba, "__esModule", { value: !0 });
const Mn = ee, zm = V, Um = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, Mn._)`{passingSchemas: ${e.passing}}`
}, qm = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Um,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, it: s } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (s.opts.discriminator && n.discriminator)
      return;
    const a = r, o = t.let("valid", !1), l = t.let("passing", null), c = t.name("_valid");
    e.setParams({ passing: l }), t.block(d), e.result(o, () => e.reset(), () => e.error(!0));
    function d() {
      a.forEach((u, h) => {
        let w;
        (0, zm.alwaysValidSchema)(s, u) ? t.var(c, !0) : w = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, Mn._)`${c} && ${o}`).assign(o, !1).assign(l, (0, Mn._)`[${l}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(l, h), w && e.mergeEvaluated(w, Mn.Name);
        });
      });
    }
  }
};
Ba.default = qm;
var Xa = {};
Object.defineProperty(Xa, "__esModule", { value: !0 });
const Km = V, Gm = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, Km.alwaysValidSchema)(n, a))
        return;
      const l = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(l);
    });
  }
};
Xa.default = Gm;
var Ja = {};
Object.defineProperty(Ja, "__esModule", { value: !0 });
const Bn = ee, Cl = V, Hm = {
  message: ({ params: e }) => (0, Bn.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, Bn._)`{failingKeyword: ${e.ifClause}}`
}, Bm = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: Hm,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Cl.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = Di(n, "then"), a = Di(n, "else");
    if (!s && !a)
      return;
    const o = t.let("valid", !0), l = t.name("_valid");
    if (c(), e.reset(), s && a) {
      const u = t.let("ifClause");
      e.setParams({ ifClause: u }), t.if(l, d("then", u), d("else", u));
    } else s ? t.if(l, d("then")) : t.if((0, Bn.not)(l), d("else"));
    e.pass(o, () => e.error(!0));
    function c() {
      const u = e.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, l);
      e.mergeEvaluated(u);
    }
    function d(u, h) {
      return () => {
        const w = e.subschema({ keyword: u }, l);
        t.assign(o, l), e.mergeValidEvaluated(w, o), h ? t.assign(h, (0, Bn._)`${u}`) : e.setParams({ ifClause: u });
      };
    }
  }
};
function Di(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Cl.alwaysValidSchema)(e, r);
}
Ja.default = Bm;
var Wa = {};
Object.defineProperty(Wa, "__esModule", { value: !0 });
const Xm = V, Jm = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, Xm.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
Wa.default = Jm;
Object.defineProperty(Va, "__esModule", { value: !0 });
const Wm = Rr, Ym = La, Qm = Or, Zm = Fa, xm = za, ep = ns, tp = Ua, rp = ss, np = qa, sp = Ka, ap = Ga, op = Ha, ip = Ba, cp = Xa, lp = Ja, up = Wa;
function dp(e = !1) {
  const t = [
    // any
    ap.default,
    op.default,
    ip.default,
    cp.default,
    lp.default,
    up.default,
    // object
    tp.default,
    rp.default,
    ep.default,
    np.default,
    sp.default
  ];
  return e ? t.push(Ym.default, Zm.default) : t.push(Wm.default, Qm.default), t.push(xm.default), t;
}
Va.default = dp;
var Ya = {}, Ir = {};
Object.defineProperty(Ir, "__esModule", { value: !0 });
Ir.dynamicAnchor = void 0;
const Ps = ee, fp = at(), Mi = Fe, hp = bt, mp = {
  keyword: "$dynamicAnchor",
  schemaType: "string",
  code: (e) => Dl(e, e.schema)
};
function Dl(e, t) {
  const { gen: r, it: n } = e;
  n.schemaEnv.root.dynamicAnchors[t] = !0;
  const s = (0, Ps._)`${fp.default.dynamicAnchors}${(0, Ps.getProperty)(t)}`, a = n.errSchemaPath === "#" ? n.validateName : pp(e);
  r.if((0, Ps._)`!${s}`, () => r.assign(s, a));
}
Ir.dynamicAnchor = Dl;
function pp(e) {
  const { schemaEnv: t, schema: r, self: n } = e.it, { root: s, baseId: a, localRefs: o, meta: l } = t.root, { schemaId: c } = n.opts, d = new Mi.SchemaEnv({ schema: r, schemaId: c, root: s, baseId: a, localRefs: o, meta: l });
  return Mi.compileSchema.call(n, d), (0, hp.getValidate)(e, d);
}
Ir.default = mp;
var Tr = {};
Object.defineProperty(Tr, "__esModule", { value: !0 });
Tr.dynamicRef = void 0;
const Vi = ee, $p = at(), Li = bt, yp = {
  keyword: "$dynamicRef",
  schemaType: "string",
  code: (e) => Ml(e, e.schema)
};
function Ml(e, t) {
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
      const d = r.let("_v", (0, Vi._)`${$p.default.dynamicAnchors}${(0, Vi.getProperty)(a)}`);
      r.if(d, l(d, c), l(s.validateName, c));
    } else
      l(s.validateName, c)();
  }
  function l(c, d) {
    return d ? () => r.block(() => {
      (0, Li.callRef)(e, c), r.let(d, !0);
    }) : () => (0, Li.callRef)(e, c);
  }
}
Tr.dynamicRef = Ml;
Tr.default = yp;
var Qa = {};
Object.defineProperty(Qa, "__esModule", { value: !0 });
const gp = Ir, _p = V, vp = {
  keyword: "$recursiveAnchor",
  schemaType: "boolean",
  code(e) {
    e.schema ? (0, gp.dynamicAnchor)(e, "") : (0, _p.checkStrictMode)(e.it, "$recursiveAnchor: false is ignored");
  }
};
Qa.default = vp;
var Za = {};
Object.defineProperty(Za, "__esModule", { value: !0 });
const wp = Tr, Ep = {
  keyword: "$recursiveRef",
  schemaType: "string",
  code: (e) => (0, wp.dynamicRef)(e, e.schema)
};
Za.default = Ep;
Object.defineProperty(Ya, "__esModule", { value: !0 });
const bp = Ir, Sp = Tr, Pp = Qa, Np = Za, Rp = [bp.default, Sp.default, Pp.default, Np.default];
Ya.default = Rp;
var xa = {}, eo = {};
Object.defineProperty(eo, "__esModule", { value: !0 });
const Fi = ns, Op = {
  keyword: "dependentRequired",
  type: "object",
  schemaType: "object",
  error: Fi.error,
  code: (e) => (0, Fi.validatePropertyDeps)(e)
};
eo.default = Op;
var to = {};
Object.defineProperty(to, "__esModule", { value: !0 });
const Ip = ns, Tp = {
  keyword: "dependentSchemas",
  type: "object",
  schemaType: "object",
  code: (e) => (0, Ip.validateSchemaDeps)(e)
};
to.default = Tp;
var ro = {};
Object.defineProperty(ro, "__esModule", { value: !0 });
const jp = V, Ap = {
  keyword: ["maxContains", "minContains"],
  type: "array",
  schemaType: "number",
  code({ keyword: e, parentSchema: t, it: r }) {
    t.contains === void 0 && (0, jp.checkStrictMode)(r, `"${e}" without "contains" is ignored`);
  }
};
ro.default = Ap;
Object.defineProperty(xa, "__esModule", { value: !0 });
const kp = eo, Cp = to, Dp = ro, Mp = [kp.default, Cp.default, Dp.default];
xa.default = Mp;
var no = {}, so = {};
Object.defineProperty(so, "__esModule", { value: !0 });
const jt = ee, zi = V, Vp = at(), Lp = {
  message: "must NOT have unevaluated properties",
  params: ({ params: e }) => (0, jt._)`{unevaluatedProperty: ${e.unevaluatedProperty}}`
}, Fp = {
  keyword: "unevaluatedProperties",
  type: "object",
  schemaType: ["boolean", "object"],
  trackErrors: !0,
  error: Lp,
  code(e) {
    const { gen: t, schema: r, data: n, errsCount: s, it: a } = e;
    if (!s)
      throw new Error("ajv implementation error");
    const { allErrors: o, props: l } = a;
    l instanceof jt.Name ? t.if((0, jt._)`${l} !== true`, () => t.forIn("key", n, (h) => t.if(d(l, h), () => c(h)))) : l !== !0 && t.forIn("key", n, (h) => l === void 0 ? c(h) : t.if(u(l, h), () => c(h))), a.props = !0, e.ok((0, jt._)`${s} === ${Vp.default.errors}`);
    function c(h) {
      if (r === !1) {
        e.setParams({ unevaluatedProperty: h }), e.error(), o || t.break();
        return;
      }
      if (!(0, zi.alwaysValidSchema)(a, r)) {
        const w = t.name("valid");
        e.subschema({
          keyword: "unevaluatedProperties",
          dataProp: h,
          dataPropType: zi.Type.Str
        }, w), o || t.if((0, jt.not)(w), () => t.break());
      }
    }
    function d(h, w) {
      return (0, jt._)`!${h} || !${h}[${w}]`;
    }
    function u(h, w) {
      const y = [];
      for (const v in h)
        h[v] === !0 && y.push((0, jt._)`${w} !== ${v}`);
      return (0, jt.and)(...y);
    }
  }
};
so.default = Fp;
var ao = {};
Object.defineProperty(ao, "__esModule", { value: !0 });
const Jt = ee, Ui = V, zp = {
  message: ({ params: { len: e } }) => (0, Jt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Jt._)`{limit: ${e}}`
}, Up = {
  keyword: "unevaluatedItems",
  type: "array",
  schemaType: ["boolean", "object"],
  error: zp,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e, a = s.items || 0;
    if (a === !0)
      return;
    const o = t.const("len", (0, Jt._)`${n}.length`);
    if (r === !1)
      e.setParams({ len: a }), e.fail((0, Jt._)`${o} > ${a}`);
    else if (typeof r == "object" && !(0, Ui.alwaysValidSchema)(s, r)) {
      const c = t.var("valid", (0, Jt._)`${o} <= ${a}`);
      t.if((0, Jt.not)(c), () => l(c, a)), e.ok(c);
    }
    s.items = !0;
    function l(c, d) {
      t.forRange("i", d, o, (u) => {
        e.subschema({ keyword: "unevaluatedItems", dataProp: u, dataPropType: Ui.Type.Num }, c), s.allErrors || t.if((0, Jt.not)(c), () => t.break());
      });
    }
  }
};
ao.default = Up;
Object.defineProperty(no, "__esModule", { value: !0 });
const qp = so, Kp = ao, Gp = [qp.default, Kp.default];
no.default = Gp;
var oo = {}, io = {};
Object.defineProperty(io, "__esModule", { value: !0 });
const ge = ee, Hp = {
  message: ({ schemaCode: e }) => (0, ge.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, ge._)`{format: ${e}}`
}, Bp = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: Hp,
  code(e, t) {
    const { gen: r, data: n, $data: s, schema: a, schemaCode: o, it: l } = e, { opts: c, errSchemaPath: d, schemaEnv: u, self: h } = l;
    if (!c.validateFormats)
      return;
    s ? w() : y();
    function w() {
      const v = r.scopeValue("formats", {
        ref: h.formats,
        code: c.code.formats
      }), _ = r.const("fDef", (0, ge._)`${v}[${o}]`), g = r.let("fType"), m = r.let("format");
      r.if((0, ge._)`typeof ${_} == "object" && !(${_} instanceof RegExp)`, () => r.assign(g, (0, ge._)`${_}.type || "string"`).assign(m, (0, ge._)`${_}.validate`), () => r.assign(g, (0, ge._)`"string"`).assign(m, _)), e.fail$data((0, ge.or)(E(), R()));
      function E() {
        return c.strictSchema === !1 ? ge.nil : (0, ge._)`${o} && !${m}`;
      }
      function R() {
        const O = u.$async ? (0, ge._)`(${_}.async ? await ${m}(${n}) : ${m}(${n}))` : (0, ge._)`${m}(${n})`, T = (0, ge._)`(typeof ${m} == "function" ? ${O} : ${m}.test(${n}))`;
        return (0, ge._)`${m} && ${m} !== true && ${g} === ${t} && !${T}`;
      }
    }
    function y() {
      const v = h.formats[a];
      if (!v) {
        E();
        return;
      }
      if (v === !0)
        return;
      const [_, g, m] = R(v);
      _ === t && e.pass(O());
      function E() {
        if (c.strictSchema === !1) {
          h.logger.warn(T());
          return;
        }
        throw new Error(T());
        function T() {
          return `unknown format "${a}" ignored in schema at path "${d}"`;
        }
      }
      function R(T) {
        const K = T instanceof RegExp ? (0, ge.regexpCode)(T) : c.code.formats ? (0, ge._)`${c.code.formats}${(0, ge.getProperty)(a)}` : void 0, J = r.scopeValue("formats", { key: a, ref: T, code: K });
        return typeof T == "object" && !(T instanceof RegExp) ? [T.type || "string", T.validate, (0, ge._)`${J}.validate`] : ["string", T, J];
      }
      function O() {
        if (typeof v == "object" && !(v instanceof RegExp) && v.async) {
          if (!u.$async)
            throw new Error("async format in sync schema");
          return (0, ge._)`await ${m}(${n})`;
        }
        return typeof g == "function" ? (0, ge._)`${m}(${n})` : (0, ge._)`${m}.test(${n})`;
      }
    }
  }
};
io.default = Bp;
Object.defineProperty(oo, "__esModule", { value: !0 });
const Xp = io, Jp = [Xp.default];
oo.default = Jp;
var br = {};
Object.defineProperty(br, "__esModule", { value: !0 });
br.contentVocabulary = br.metadataVocabulary = void 0;
br.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
br.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(Ea, "__esModule", { value: !0 });
const Wp = ba, Yp = Pa, Qp = Va, Zp = Ya, xp = xa, e$ = no, t$ = oo, qi = br, r$ = [
  Zp.default,
  Wp.default,
  Yp.default,
  (0, Qp.default)(!0),
  t$.default,
  qi.metadataVocabulary,
  qi.contentVocabulary,
  xp.default,
  e$.default
];
Ea.default = r$;
var co = {}, as = {};
Object.defineProperty(as, "__esModule", { value: !0 });
as.DiscrError = void 0;
var Ki;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(Ki || (as.DiscrError = Ki = {}));
Object.defineProperty(co, "__esModule", { value: !0 });
const dr = ee, Xs = as, Gi = Fe, n$ = Nr, s$ = V, a$ = {
  message: ({ params: { discrError: e, tagName: t } }) => e === Xs.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, dr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, o$ = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: a$,
  code(e) {
    const { gen: t, data: r, schema: n, parentSchema: s, it: a } = e, { oneOf: o } = s;
    if (!a.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const l = n.propertyName;
    if (typeof l != "string")
      throw new Error("discriminator: requires propertyName");
    if (n.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!o)
      throw new Error("discriminator: requires oneOf keyword");
    const c = t.let("valid", !1), d = t.const("tag", (0, dr._)`${r}${(0, dr.getProperty)(l)}`);
    t.if((0, dr._)`typeof ${d} == "string"`, () => u(), () => e.error(!1, { discrError: Xs.DiscrError.Tag, tag: d, tagName: l })), e.ok(c);
    function u() {
      const y = w();
      t.if(!1);
      for (const v in y)
        t.elseIf((0, dr._)`${d} === ${v}`), t.assign(c, h(y[v]));
      t.else(), e.error(!1, { discrError: Xs.DiscrError.Mapping, tag: d, tagName: l }), t.endIf();
    }
    function h(y) {
      const v = t.name("valid"), _ = e.subschema({ keyword: "oneOf", schemaProp: y }, v);
      return e.mergeEvaluated(_, dr.Name), v;
    }
    function w() {
      var y;
      const v = {}, _ = m(s);
      let g = !0;
      for (let O = 0; O < o.length; O++) {
        let T = o[O];
        if (T != null && T.$ref && !(0, s$.schemaHasRulesButRef)(T, a.self.RULES)) {
          const J = T.$ref;
          if (T = Gi.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, J), T instanceof Gi.SchemaEnv && (T = T.schema), T === void 0)
            throw new n$.default(a.opts.uriResolver, a.baseId, J);
        }
        const K = (y = T == null ? void 0 : T.properties) === null || y === void 0 ? void 0 : y[l];
        if (typeof K != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${l}"`);
        g = g && (_ || m(T)), E(K, O);
      }
      if (!g)
        throw new Error(`discriminator: "${l}" must be required`);
      return v;
      function m({ required: O }) {
        return Array.isArray(O) && O.includes(l);
      }
      function E(O, T) {
        if (O.const)
          R(O.const, T);
        else if (O.enum)
          for (const K of O.enum)
            R(K, T);
        else
          throw new Error(`discriminator: "properties/${l}" must have "const" or "enum"`);
      }
      function R(O, T) {
        if (typeof O != "string" || O in v)
          throw new Error(`discriminator: "${l}" values must be unique strings`);
        v[O] = T;
      }
    }
  }
};
co.default = o$;
var lo = {};
const i$ = "https://json-schema.org/draft/2020-12/schema", c$ = "https://json-schema.org/draft/2020-12/schema", l$ = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0,
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0,
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
  "https://json-schema.org/draft/2020-12/vocab/validation": !0,
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, u$ = "meta", d$ = "Core and Validation specifications meta-schema", f$ = [
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
], h$ = [
  "object",
  "boolean"
], m$ = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.", p$ = {
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
}, $$ = {
  $schema: i$,
  $id: c$,
  $vocabulary: l$,
  $dynamicAnchor: u$,
  title: d$,
  allOf: f$,
  type: h$,
  $comment: m$,
  properties: p$
}, y$ = "https://json-schema.org/draft/2020-12/schema", g$ = "https://json-schema.org/draft/2020-12/meta/applicator", _$ = {
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0
}, v$ = "meta", w$ = "Applicator vocabulary meta-schema", E$ = [
  "object",
  "boolean"
], b$ = {
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
}, S$ = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $dynamicRef: "#meta"
    }
  }
}, P$ = {
  $schema: y$,
  $id: g$,
  $vocabulary: _$,
  $dynamicAnchor: v$,
  title: w$,
  type: E$,
  properties: b$,
  $defs: S$
}, N$ = "https://json-schema.org/draft/2020-12/schema", R$ = "https://json-schema.org/draft/2020-12/meta/unevaluated", O$ = {
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0
}, I$ = "meta", T$ = "Unevaluated applicator vocabulary meta-schema", j$ = [
  "object",
  "boolean"
], A$ = {
  unevaluatedItems: {
    $dynamicRef: "#meta"
  },
  unevaluatedProperties: {
    $dynamicRef: "#meta"
  }
}, k$ = {
  $schema: N$,
  $id: R$,
  $vocabulary: O$,
  $dynamicAnchor: I$,
  title: T$,
  type: j$,
  properties: A$
}, C$ = "https://json-schema.org/draft/2020-12/schema", D$ = "https://json-schema.org/draft/2020-12/meta/content", M$ = {
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, V$ = "meta", L$ = "Content vocabulary meta-schema", F$ = [
  "object",
  "boolean"
], z$ = {
  contentEncoding: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentSchema: {
    $dynamicRef: "#meta"
  }
}, U$ = {
  $schema: C$,
  $id: D$,
  $vocabulary: M$,
  $dynamicAnchor: V$,
  title: L$,
  type: F$,
  properties: z$
}, q$ = "https://json-schema.org/draft/2020-12/schema", K$ = "https://json-schema.org/draft/2020-12/meta/core", G$ = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0
}, H$ = "meta", B$ = "Core vocabulary meta-schema", X$ = [
  "object",
  "boolean"
], J$ = {
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
}, W$ = {
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
}, Y$ = {
  $schema: q$,
  $id: K$,
  $vocabulary: G$,
  $dynamicAnchor: H$,
  title: B$,
  type: X$,
  properties: J$,
  $defs: W$
}, Q$ = "https://json-schema.org/draft/2020-12/schema", Z$ = "https://json-schema.org/draft/2020-12/meta/format-annotation", x$ = {
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0
}, ey = "meta", ty = "Format vocabulary meta-schema for annotation results", ry = [
  "object",
  "boolean"
], ny = {
  format: {
    type: "string"
  }
}, sy = {
  $schema: Q$,
  $id: Z$,
  $vocabulary: x$,
  $dynamicAnchor: ey,
  title: ty,
  type: ry,
  properties: ny
}, ay = "https://json-schema.org/draft/2020-12/schema", oy = "https://json-schema.org/draft/2020-12/meta/meta-data", iy = {
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0
}, cy = "meta", ly = "Meta-data vocabulary meta-schema", uy = [
  "object",
  "boolean"
], dy = {
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
}, fy = {
  $schema: ay,
  $id: oy,
  $vocabulary: iy,
  $dynamicAnchor: cy,
  title: ly,
  type: uy,
  properties: dy
}, hy = "https://json-schema.org/draft/2020-12/schema", my = "https://json-schema.org/draft/2020-12/meta/validation", py = {
  "https://json-schema.org/draft/2020-12/vocab/validation": !0
}, $y = "meta", yy = "Validation vocabulary meta-schema", gy = [
  "object",
  "boolean"
], _y = {
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
}, vy = {
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
}, wy = {
  $schema: hy,
  $id: my,
  $vocabulary: py,
  $dynamicAnchor: $y,
  title: yy,
  type: gy,
  properties: _y,
  $defs: vy
};
Object.defineProperty(lo, "__esModule", { value: !0 });
const Ey = $$, by = P$, Sy = k$, Py = U$, Ny = Y$, Ry = sy, Oy = fy, Iy = wy, Ty = ["/properties"];
function jy(e) {
  return [
    Ey,
    by,
    Sy,
    Py,
    Ny,
    t(this, Ry),
    Oy,
    t(this, Iy)
  ].forEach((r) => this.addMetaSchema(r, void 0, !1)), this;
  function t(r, n) {
    return e ? r.$dataMetaSchema(n, Ty) : n;
  }
}
lo.default = jy;
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv2020 = void 0;
  const r = Jc, n = Ea, s = co, a = lo, o = "https://json-schema.org/draft/2020-12/schema";
  class l extends r.default {
    constructor(y = {}) {
      super({
        ...y,
        dynamicRef: !0,
        next: !0,
        unevaluated: !0
      });
    }
    _addVocabularies() {
      super._addVocabularies(), n.default.forEach((y) => this.addVocabulary(y)), this.opts.discriminator && this.addKeyword(s.default);
    }
    _addDefaultMetaSchema() {
      super._addDefaultMetaSchema();
      const { $data: y, meta: v } = this.opts;
      v && (a.default.call(this, y), this.refs["http://json-schema.org/schema"] = o);
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(o) ? o : void 0);
    }
  }
  t.Ajv2020 = l, e.exports = t = l, e.exports.Ajv2020 = l, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = l;
  var c = xn();
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return c.KeywordCxt;
  } });
  var d = ee;
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
  var u = rn;
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return u.default;
  } });
  var h = Nr;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return h.default;
  } });
})(zs, zs.exports);
var Ay = zs.exports, Js = { exports: {} }, Vl = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatNames = e.fastFormats = e.fullFormats = void 0;
  function t(q, X) {
    return { validate: q, compare: X };
  }
  e.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: t(a, o),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: t(c(!0), d),
    "date-time": t(w(!0), y),
    "iso-time": t(c(), u),
    "iso-date-time": t(w(), v),
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
    regex: pe,
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
    byte: R,
    // signed 32 bit integer
    int32: { type: "number", validate: K },
    // signed 64 bit integer
    int64: { type: "number", validate: J },
    // C-type float
    float: { type: "number", validate: ie },
    // C-type double
    double: { type: "number", validate: ie },
    // hint to the UI to hide input strings
    password: !0,
    // unchecked string payload
    binary: !0
  }, e.fastFormats = {
    ...e.fullFormats,
    date: t(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, o),
    time: t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, d),
    "date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, y),
    "iso-time": t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, u),
    "iso-date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, v),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  }, e.formatNames = Object.keys(e.fullFormats);
  function r(q) {
    return q % 4 === 0 && (q % 100 !== 0 || q % 400 === 0);
  }
  const n = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, s = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function a(q) {
    const X = n.exec(q);
    if (!X)
      return !1;
    const W = +X[1], H = +X[2], ce = +X[3];
    return H >= 1 && H <= 12 && ce >= 1 && ce <= (H === 2 && r(W) ? 29 : s[H]);
  }
  function o(q, X) {
    if (q && X)
      return q > X ? 1 : q < X ? -1 : 0;
  }
  const l = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function c(q) {
    return function(W) {
      const H = l.exec(W);
      if (!H)
        return !1;
      const ce = +H[1], ve = +H[2], M = +H[3], C = H[4], z = H[5] === "-" ? -1 : 1, P = +(H[6] || 0), p = +(H[7] || 0);
      if (P > 23 || p > 59 || q && !C)
        return !1;
      if (ce <= 23 && ve <= 59 && M < 60)
        return !0;
      const S = ve - p * z, $ = ce - P * z - (S < 0 ? 1 : 0);
      return ($ === 23 || $ === -1) && (S === 59 || S === -1) && M < 61;
    };
  }
  function d(q, X) {
    if (!(q && X))
      return;
    const W = (/* @__PURE__ */ new Date("2020-01-01T" + q)).valueOf(), H = (/* @__PURE__ */ new Date("2020-01-01T" + X)).valueOf();
    if (W && H)
      return W - H;
  }
  function u(q, X) {
    if (!(q && X))
      return;
    const W = l.exec(q), H = l.exec(X);
    if (W && H)
      return q = W[1] + W[2] + W[3], X = H[1] + H[2] + H[3], q > X ? 1 : q < X ? -1 : 0;
  }
  const h = /t|\s/i;
  function w(q) {
    const X = c(q);
    return function(H) {
      const ce = H.split(h);
      return ce.length === 2 && a(ce[0]) && X(ce[1]);
    };
  }
  function y(q, X) {
    if (!(q && X))
      return;
    const W = new Date(q).valueOf(), H = new Date(X).valueOf();
    if (W && H)
      return W - H;
  }
  function v(q, X) {
    if (!(q && X))
      return;
    const [W, H] = q.split(h), [ce, ve] = X.split(h), M = o(W, ce);
    if (M !== void 0)
      return M || d(H, ve);
  }
  const _ = /\/|:/, g = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function m(q) {
    return _.test(q) && g.test(q);
  }
  const E = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function R(q) {
    return E.lastIndex = 0, E.test(q);
  }
  const O = -2147483648, T = 2 ** 31 - 1;
  function K(q) {
    return Number.isInteger(q) && q <= T && q >= O;
  }
  function J(q) {
    return Number.isInteger(q);
  }
  function ie() {
    return !0;
  }
  const de = /[^\\]\\Z/;
  function pe(q) {
    if (de.test(q))
      return !1;
    try {
      return new RegExp(q), !0;
    } catch {
      return !1;
    }
  }
})(Vl);
var Ll = {}, Ws = { exports: {} }, Fl = {}, st = {}, Sr = {}, sn = {}, ne = {}, en = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
  class t {
  }
  e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends t {
    constructor(E) {
      if (super(), !e.IDENTIFIER.test(E))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = E;
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
    constructor(E) {
      super(), this._items = typeof E == "string" ? [E] : E;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const E = this._items[0];
      return E === "" || E === '""';
    }
    get str() {
      var E;
      return (E = this._str) !== null && E !== void 0 ? E : this._str = this._items.reduce((R, O) => `${R}${O}`, "");
    }
    get names() {
      var E;
      return (E = this._names) !== null && E !== void 0 ? E : this._names = this._items.reduce((R, O) => (O instanceof r && (R[O.str] = (R[O.str] || 0) + 1), R), {});
    }
  }
  e._Code = n, e.nil = new n("");
  function s(m, ...E) {
    const R = [m[0]];
    let O = 0;
    for (; O < E.length; )
      l(R, E[O]), R.push(m[++O]);
    return new n(R);
  }
  e._ = s;
  const a = new n("+");
  function o(m, ...E) {
    const R = [y(m[0])];
    let O = 0;
    for (; O < E.length; )
      R.push(a), l(R, E[O]), R.push(a, y(m[++O]));
    return c(R), new n(R);
  }
  e.str = o;
  function l(m, E) {
    E instanceof n ? m.push(...E._items) : E instanceof r ? m.push(E) : m.push(h(E));
  }
  e.addCodeArg = l;
  function c(m) {
    let E = 1;
    for (; E < m.length - 1; ) {
      if (m[E] === a) {
        const R = d(m[E - 1], m[E + 1]);
        if (R !== void 0) {
          m.splice(E - 1, 3, R);
          continue;
        }
        m[E++] = "+";
      }
      E++;
    }
  }
  function d(m, E) {
    if (E === '""')
      return m;
    if (m === '""')
      return E;
    if (typeof m == "string")
      return E instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof E != "string" ? `${m.slice(0, -1)}${E}"` : E[0] === '"' ? m.slice(0, -1) + E.slice(1) : void 0;
    if (typeof E == "string" && E[0] === '"' && !(m instanceof r))
      return `"${m}${E.slice(1)}`;
  }
  function u(m, E) {
    return E.emptyStr() ? m : m.emptyStr() ? E : o`${m}${E}`;
  }
  e.strConcat = u;
  function h(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : y(Array.isArray(m) ? m.join(",") : m);
  }
  function w(m) {
    return new n(y(m));
  }
  e.stringify = w;
  function y(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  e.safeStringify = y;
  function v(m) {
    return typeof m == "string" && e.IDENTIFIER.test(m) ? new n(`.${m}`) : s`[${m}]`;
  }
  e.getProperty = v;
  function _(m) {
    if (typeof m == "string" && e.IDENTIFIER.test(m))
      return new n(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  e.getEsmExportName = _;
  function g(m) {
    return new n(m.toString());
  }
  e.regexpCode = g;
})(en);
var Ys = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = en;
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
    constructor({ prefixes: d, parent: u } = {}) {
      this._names = {}, this._prefixes = d, this._parent = u;
    }
    toName(d) {
      return d instanceof t.Name ? d : this.name(d);
    }
    name(d) {
      return new t.Name(this._newName(d));
    }
    _newName(d) {
      const u = this._names[d] || this._nameGroup(d);
      return `${d}${u.index++}`;
    }
    _nameGroup(d) {
      var u, h;
      if (!((h = (u = this._parent) === null || u === void 0 ? void 0 : u._prefixes) === null || h === void 0) && h.has(d) || this._prefixes && !this._prefixes.has(d))
        throw new Error(`CodeGen: prefix "${d}" is not allowed in this scope`);
      return this._names[d] = { prefix: d, index: 0 };
    }
  }
  e.Scope = s;
  class a extends t.Name {
    constructor(d, u) {
      super(u), this.prefix = d;
    }
    setValue(d, { property: u, itemIndex: h }) {
      this.value = d, this.scopePath = (0, t._)`.${new t.Name(u)}[${h}]`;
    }
  }
  e.ValueScopeName = a;
  const o = (0, t._)`\n`;
  class l extends s {
    constructor(d) {
      super(d), this._values = {}, this._scope = d.scope, this.opts = { ...d, _n: d.lines ? o : t.nil };
    }
    get() {
      return this._scope;
    }
    name(d) {
      return new a(d, this._newName(d));
    }
    value(d, u) {
      var h;
      if (u.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const w = this.toName(d), { prefix: y } = w, v = (h = u.key) !== null && h !== void 0 ? h : u.ref;
      let _ = this._values[y];
      if (_) {
        const E = _.get(v);
        if (E)
          return E;
      } else
        _ = this._values[y] = /* @__PURE__ */ new Map();
      _.set(v, w);
      const g = this._scope[y] || (this._scope[y] = []), m = g.length;
      return g[m] = u.ref, w.setValue(u, { property: y, itemIndex: m }), w;
    }
    getValue(d, u) {
      const h = this._values[d];
      if (h)
        return h.get(u);
    }
    scopeRefs(d, u = this._values) {
      return this._reduceValues(u, (h) => {
        if (h.scopePath === void 0)
          throw new Error(`CodeGen: name "${h}" has no value`);
        return (0, t._)`${d}${h.scopePath}`;
      });
    }
    scopeCode(d = this._values, u, h) {
      return this._reduceValues(d, (w) => {
        if (w.value === void 0)
          throw new Error(`CodeGen: name "${w}" has no value`);
        return w.value.code;
      }, u, h);
    }
    _reduceValues(d, u, h = {}, w) {
      let y = t.nil;
      for (const v in d) {
        const _ = d[v];
        if (!_)
          continue;
        const g = h[v] = h[v] || /* @__PURE__ */ new Map();
        _.forEach((m) => {
          if (g.has(m))
            return;
          g.set(m, n.Started);
          let E = u(m);
          if (E) {
            const R = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
            y = (0, t._)`${y}${R} ${m} = ${E};${this.opts._n}`;
          } else if (E = w == null ? void 0 : w(m))
            y = (0, t._)`${y}${E}${this.opts._n}`;
          else
            throw new r(m);
          g.set(m, n.Completed);
        });
      }
      return y;
    }
  }
  e.ValueScope = l;
})(Ys);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = en, r = Ys;
  var n = en;
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
  var s = Ys;
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
    constructor(i, f, b) {
      super(), this.varKind = i, this.name = f, this.rhs = b;
    }
    render({ es5: i, _n: f }) {
      const b = i ? r.varKinds.var : this.varKind, j = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${b} ${this.name}${j};` + f;
    }
    optimizeNames(i, f) {
      if (i[this.name.str])
        return this.rhs && (this.rhs = H(this.rhs, i, f)), this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class l extends a {
    constructor(i, f, b) {
      super(), this.lhs = i, this.rhs = f, this.sideEffects = b;
    }
    render({ _n: i }) {
      return `${this.lhs} = ${this.rhs};` + i;
    }
    optimizeNames(i, f) {
      if (!(this.lhs instanceof t.Name && !i[this.lhs.str] && !this.sideEffects))
        return this.rhs = H(this.rhs, i, f), this;
    }
    get names() {
      const i = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return W(i, this.rhs);
    }
  }
  class c extends l {
    constructor(i, f, b, j) {
      super(i, b, j), this.op = f;
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
  class u extends a {
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
  class w extends a {
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
      return this.code = H(this.code, i, f), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class y extends a {
    constructor(i = []) {
      super(), this.nodes = i;
    }
    render(i) {
      return this.nodes.reduce((f, b) => f + b.render(i), "");
    }
    optimizeNodes() {
      const { nodes: i } = this;
      let f = i.length;
      for (; f--; ) {
        const b = i[f].optimizeNodes();
        Array.isArray(b) ? i.splice(f, 1, ...b) : b ? i[f] = b : i.splice(f, 1);
      }
      return i.length > 0 ? this : void 0;
    }
    optimizeNames(i, f) {
      const { nodes: b } = this;
      let j = b.length;
      for (; j--; ) {
        const A = b[j];
        A.optimizeNames(i, f) || (ce(i, A.names), b.splice(j, 1));
      }
      return b.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((i, f) => X(i, f.names), {});
    }
  }
  class v extends y {
    render(i) {
      return "{" + i._n + super.render(i) + "}" + i._n;
    }
  }
  class _ extends y {
  }
  class g extends v {
  }
  g.kind = "else";
  class m extends v {
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
        const b = f.optimizeNodes();
        f = this.else = Array.isArray(b) ? new g(b) : b;
      }
      if (f)
        return i === !1 ? f instanceof m ? f : f.nodes : this.nodes.length ? this : new m(ve(i), f instanceof m ? [f] : f.nodes);
      if (!(i === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(i, f) {
      var b;
      if (this.else = (b = this.else) === null || b === void 0 ? void 0 : b.optimizeNames(i, f), !!(super.optimizeNames(i, f) || this.else))
        return this.condition = H(this.condition, i, f), this;
    }
    get names() {
      const i = super.names;
      return W(i, this.condition), this.else && X(i, this.else.names), i;
    }
  }
  m.kind = "if";
  class E extends v {
  }
  E.kind = "for";
  class R extends E {
    constructor(i) {
      super(), this.iteration = i;
    }
    render(i) {
      return `for(${this.iteration})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iteration = H(this.iteration, i, f), this;
    }
    get names() {
      return X(super.names, this.iteration.names);
    }
  }
  class O extends E {
    constructor(i, f, b, j) {
      super(), this.varKind = i, this.name = f, this.from = b, this.to = j;
    }
    render(i) {
      const f = i.es5 ? r.varKinds.var : this.varKind, { name: b, from: j, to: A } = this;
      return `for(${f} ${b}=${j}; ${b}<${A}; ${b}++)` + super.render(i);
    }
    get names() {
      const i = W(super.names, this.from);
      return W(i, this.to);
    }
  }
  class T extends E {
    constructor(i, f, b, j) {
      super(), this.loop = i, this.varKind = f, this.name = b, this.iterable = j;
    }
    render(i) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(i);
    }
    optimizeNames(i, f) {
      if (super.optimizeNames(i, f))
        return this.iterable = H(this.iterable, i, f), this;
    }
    get names() {
      return X(super.names, this.iterable.names);
    }
  }
  class K extends v {
    constructor(i, f, b) {
      super(), this.name = i, this.args = f, this.async = b;
    }
    render(i) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(i);
    }
  }
  K.kind = "func";
  class J extends y {
    render(i) {
      return "return " + super.render(i);
    }
  }
  J.kind = "return";
  class ie extends v {
    render(i) {
      let f = "try" + super.render(i);
      return this.catch && (f += this.catch.render(i)), this.finally && (f += this.finally.render(i)), f;
    }
    optimizeNodes() {
      var i, f;
      return super.optimizeNodes(), (i = this.catch) === null || i === void 0 || i.optimizeNodes(), (f = this.finally) === null || f === void 0 || f.optimizeNodes(), this;
    }
    optimizeNames(i, f) {
      var b, j;
      return super.optimizeNames(i, f), (b = this.catch) === null || b === void 0 || b.optimizeNames(i, f), (j = this.finally) === null || j === void 0 || j.optimizeNames(i, f), this;
    }
    get names() {
      const i = super.names;
      return this.catch && X(i, this.catch.names), this.finally && X(i, this.finally.names), i;
    }
  }
  class de extends v {
    constructor(i) {
      super(), this.error = i;
    }
    render(i) {
      return `catch(${this.error})` + super.render(i);
    }
  }
  de.kind = "catch";
  class pe extends v {
    render(i) {
      return "finally" + super.render(i);
    }
  }
  pe.kind = "finally";
  class q {
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
      const b = this._extScope.value(i, f);
      return (this._values[b.prefix] || (this._values[b.prefix] = /* @__PURE__ */ new Set())).add(b), b;
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
    _def(i, f, b, j) {
      const A = this._scope.toName(f);
      return b !== void 0 && j && (this._constants[A.str] = b), this._leafNode(new o(i, A, b)), A;
    }
    // `const` declaration (`var` in es5 mode)
    const(i, f, b) {
      return this._def(r.varKinds.const, i, f, b);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(i, f, b) {
      return this._def(r.varKinds.let, i, f, b);
    }
    // `var` declaration with optional assignment
    var(i, f, b) {
      return this._def(r.varKinds.var, i, f, b);
    }
    // assignment code
    assign(i, f, b) {
      return this._leafNode(new l(i, f, b));
    }
    // `+=` code
    add(i, f) {
      return this._leafNode(new c(i, e.operators.ADD, f));
    }
    // appends passed SafeExpr to code or executes Block
    code(i) {
      return typeof i == "function" ? i() : i !== t.nil && this._leafNode(new w(i)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...i) {
      const f = ["{"];
      for (const [b, j] of i)
        f.length > 1 && f.push(","), f.push(b), (b !== j || this.opts.es5) && (f.push(":"), (0, t.addCodeArg)(f, j));
      return f.push("}"), new t._Code(f);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(i, f, b) {
      if (this._blockNode(new m(i)), f && b)
        this.code(f).else().code(b).endIf();
      else if (f)
        this.code(f).endIf();
      else if (b)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(i) {
      return this._elseNode(new m(i));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new g());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, g);
    }
    _for(i, f) {
      return this._blockNode(i), f && this.code(f).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(i, f) {
      return this._for(new R(i), f);
    }
    // `for` statement for a range of values
    forRange(i, f, b, j, A = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const F = this._scope.toName(i);
      return this._for(new O(A, F, f, b), () => j(F));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(i, f, b, j = r.varKinds.const) {
      const A = this._scope.toName(i);
      if (this.opts.es5) {
        const F = f instanceof t.Name ? f : this.var("_arr", f);
        return this.forRange("_i", 0, (0, t._)`${F}.length`, (U) => {
          this.var(A, (0, t._)`${F}[${U}]`), b(A);
        });
      }
      return this._for(new T("of", j, A, f), () => b(A));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(i, f, b, j = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(i, (0, t._)`Object.keys(${f})`, b);
      const A = this._scope.toName(i);
      return this._for(new T("in", j, A, f), () => b(A));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(E);
    }
    // `label` statement
    label(i) {
      return this._leafNode(new d(i));
    }
    // `break` statement
    break(i) {
      return this._leafNode(new u(i));
    }
    // `return` statement
    return(i) {
      const f = new J();
      if (this._blockNode(f), this.code(i), f.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(J);
    }
    // `try` statement
    try(i, f, b) {
      if (!f && !b)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const j = new ie();
      if (this._blockNode(j), this.code(i), f) {
        const A = this.name("e");
        this._currNode = j.catch = new de(A), f(A);
      }
      return b && (this._currNode = j.finally = new pe(), this.code(b)), this._endBlockNode(de, pe);
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
      const b = this._nodes.length - f;
      if (b < 0 || i !== void 0 && b !== i)
        throw new Error(`CodeGen: wrong number of nodes: ${b} vs ${i} expected`);
      return this._nodes.length = f, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(i, f = t.nil, b, j) {
      return this._blockNode(new K(i, f, b)), j && this.code(j).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(K);
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
      const b = this._currNode;
      if (b instanceof i || f && b instanceof f)
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
  e.CodeGen = q;
  function X($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) + (i[f] || 0);
    return $;
  }
  function W($, i) {
    return i instanceof t._CodeOrName ? X($, i.names) : $;
  }
  function H($, i, f) {
    if ($ instanceof t.Name)
      return b($);
    if (!j($))
      return $;
    return new t._Code($._items.reduce((A, F) => (F instanceof t.Name && (F = b(F)), F instanceof t._Code ? A.push(...F._items) : A.push(F), A), []));
    function b(A) {
      const F = f[A.str];
      return F === void 0 || i[A.str] !== 1 ? A : (delete i[A.str], F);
    }
    function j(A) {
      return A instanceof t._Code && A._items.some((F) => F instanceof t.Name && i[F.str] === 1 && f[F.str] !== void 0);
    }
  }
  function ce($, i) {
    for (const f in i)
      $[f] = ($[f] || 0) - (i[f] || 0);
  }
  function ve($) {
    return typeof $ == "boolean" || typeof $ == "number" || $ === null ? !$ : (0, t._)`!${S($)}`;
  }
  e.not = ve;
  const M = p(e.operators.AND);
  function C(...$) {
    return $.reduce(M);
  }
  e.and = C;
  const z = p(e.operators.OR);
  function P(...$) {
    return $.reduce(z);
  }
  e.or = P;
  function p($) {
    return (i, f) => i === t.nil ? f : f === t.nil ? i : (0, t._)`${S(i)} ${$} ${S(f)}`;
  }
  function S($) {
    return $ instanceof t.Name ? $ : (0, t._)`(${$})`;
  }
})(ne);
var L = {};
Object.defineProperty(L, "__esModule", { value: !0 });
L.checkStrictMode = L.getErrorPath = L.Type = L.useFunc = L.setEvaluated = L.evaluatedPropsToName = L.mergeEvaluated = L.eachItem = L.unescapeJsonPointer = L.escapeJsonPointer = L.escapeFragment = L.unescapeFragment = L.schemaRefOrVal = L.schemaHasRulesButRef = L.schemaHasRules = L.checkUnknownRules = L.alwaysValidSchema = L.toHash = void 0;
const ue = ne, ky = en;
function Cy(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
L.toHash = Cy;
function Dy(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (zl(e, t), !Ul(t, e.self.RULES.all));
}
L.alwaysValidSchema = Dy;
function zl(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || Gl(e, `unknown keyword: "${a}"`);
}
L.checkUnknownRules = zl;
function Ul(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
L.schemaHasRules = Ul;
function My(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
L.schemaHasRulesButRef = My;
function Vy({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, ue._)`${r}`;
  }
  return (0, ue._)`${e}${t}${(0, ue.getProperty)(n)}`;
}
L.schemaRefOrVal = Vy;
function Ly(e) {
  return ql(decodeURIComponent(e));
}
L.unescapeFragment = Ly;
function Fy(e) {
  return encodeURIComponent(uo(e));
}
L.escapeFragment = Fy;
function uo(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
L.escapeJsonPointer = uo;
function ql(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
L.unescapeJsonPointer = ql;
function zy(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
L.eachItem = zy;
function Hi({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, l) => {
    const c = o === void 0 ? a : o instanceof ue.Name ? (a instanceof ue.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof ue.Name ? (t(s, o, a), a) : r(a, o);
    return l === ue.Name && !(c instanceof ue.Name) ? n(s, c) : c;
  };
}
L.mergeEvaluated = {
  props: Hi({
    mergeNames: (e, t, r) => e.if((0, ue._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, ue._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, ue._)`${r} || {}`).code((0, ue._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, ue._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, ue._)`${r} || {}`), fo(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: Kl
  }),
  items: Hi({
    mergeNames: (e, t, r) => e.if((0, ue._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, ue._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, ue._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, ue._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function Kl(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, ue._)`{}`);
  return t !== void 0 && fo(e, r, t), r;
}
L.evaluatedPropsToName = Kl;
function fo(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, ue._)`${t}${(0, ue.getProperty)(n)}`, !0));
}
L.setEvaluated = fo;
const Bi = {};
function Uy(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: Bi[t.code] || (Bi[t.code] = new ky._Code(t.code))
  });
}
L.useFunc = Uy;
var Qs;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(Qs || (L.Type = Qs = {}));
function qy(e, t, r) {
  if (e instanceof ue.Name) {
    const n = t === Qs.Num;
    return r ? n ? (0, ue._)`"[" + ${e} + "]"` : (0, ue._)`"['" + ${e} + "']"` : n ? (0, ue._)`"/" + ${e}` : (0, ue._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, ue.getProperty)(e).toString() : "/" + uo(e);
}
L.getErrorPath = qy;
function Gl(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
L.checkStrictMode = Gl;
var mt = {};
Object.defineProperty(mt, "__esModule", { value: !0 });
const ke = ne, Ky = {
  // validation function arguments
  data: new ke.Name("data"),
  // data passed to validation function
  // args passed from referencing schema
  valCxt: new ke.Name("valCxt"),
  // validation/data context - should not be used directly, it is destructured to the names below
  instancePath: new ke.Name("instancePath"),
  parentData: new ke.Name("parentData"),
  parentDataProperty: new ke.Name("parentDataProperty"),
  rootData: new ke.Name("rootData"),
  // root data - same as the data passed to the first/top validation function
  dynamicAnchors: new ke.Name("dynamicAnchors"),
  // used to support recursiveRef and dynamicRef
  // function scoped variables
  vErrors: new ke.Name("vErrors"),
  // null or array of validation errors
  errors: new ke.Name("errors"),
  // counter of validation errors
  this: new ke.Name("this"),
  // "globals"
  self: new ke.Name("self"),
  scope: new ke.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new ke.Name("json"),
  jsonPos: new ke.Name("jsonPos"),
  jsonLen: new ke.Name("jsonLen"),
  jsonPart: new ke.Name("jsonPart")
};
mt.default = Ky;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = ne, r = L, n = mt;
  e.keywordError = {
    message: ({ keyword: g }) => (0, t.str)`must pass "${g}" keyword validation`
  }, e.keyword$DataError = {
    message: ({ keyword: g, schemaType: m }) => m ? (0, t.str)`"${g}" keyword must be ${m} ($data)` : (0, t.str)`"${g}" keyword is invalid ($data)`
  };
  function s(g, m = e.keywordError, E, R) {
    const { it: O } = g, { gen: T, compositeRule: K, allErrors: J } = O, ie = h(g, m, E);
    R ?? (K || J) ? c(T, ie) : d(O, (0, t._)`[${ie}]`);
  }
  e.reportError = s;
  function a(g, m = e.keywordError, E) {
    const { it: R } = g, { gen: O, compositeRule: T, allErrors: K } = R, J = h(g, m, E);
    c(O, J), T || K || d(R, n.default.vErrors);
  }
  e.reportExtraError = a;
  function o(g, m) {
    g.assign(n.default.errors, m), g.if((0, t._)`${n.default.vErrors} !== null`, () => g.if(m, () => g.assign((0, t._)`${n.default.vErrors}.length`, m), () => g.assign(n.default.vErrors, null)));
  }
  e.resetErrorsCount = o;
  function l({ gen: g, keyword: m, schemaValue: E, data: R, errsCount: O, it: T }) {
    if (O === void 0)
      throw new Error("ajv implementation error");
    const K = g.name("err");
    g.forRange("i", O, n.default.errors, (J) => {
      g.const(K, (0, t._)`${n.default.vErrors}[${J}]`), g.if((0, t._)`${K}.instancePath === undefined`, () => g.assign((0, t._)`${K}.instancePath`, (0, t.strConcat)(n.default.instancePath, T.errorPath))), g.assign((0, t._)`${K}.schemaPath`, (0, t.str)`${T.errSchemaPath}/${m}`), T.opts.verbose && (g.assign((0, t._)`${K}.schema`, E), g.assign((0, t._)`${K}.data`, R));
    });
  }
  e.extendErrors = l;
  function c(g, m) {
    const E = g.const("err", m);
    g.if((0, t._)`${n.default.vErrors} === null`, () => g.assign(n.default.vErrors, (0, t._)`[${E}]`), (0, t._)`${n.default.vErrors}.push(${E})`), g.code((0, t._)`${n.default.errors}++`);
  }
  function d(g, m) {
    const { gen: E, validateName: R, schemaEnv: O } = g;
    O.$async ? E.throw((0, t._)`new ${g.ValidationError}(${m})`) : (E.assign((0, t._)`${R}.errors`, m), E.return(!1));
  }
  const u = {
    keyword: new t.Name("keyword"),
    schemaPath: new t.Name("schemaPath"),
    // also used in JTD errors
    params: new t.Name("params"),
    propertyName: new t.Name("propertyName"),
    message: new t.Name("message"),
    schema: new t.Name("schema"),
    parentSchema: new t.Name("parentSchema")
  };
  function h(g, m, E) {
    const { createErrors: R } = g.it;
    return R === !1 ? (0, t._)`{}` : w(g, m, E);
  }
  function w(g, m, E = {}) {
    const { gen: R, it: O } = g, T = [
      y(O, E),
      v(g, E)
    ];
    return _(g, m, T), R.object(...T);
  }
  function y({ errorPath: g }, { instancePath: m }) {
    const E = m ? (0, t.str)`${g}${(0, r.getErrorPath)(m, r.Type.Str)}` : g;
    return [n.default.instancePath, (0, t.strConcat)(n.default.instancePath, E)];
  }
  function v({ keyword: g, it: { errSchemaPath: m } }, { schemaPath: E, parentSchema: R }) {
    let O = R ? m : (0, t.str)`${m}/${g}`;
    return E && (O = (0, t.str)`${O}${(0, r.getErrorPath)(E, r.Type.Str)}`), [u.schemaPath, O];
  }
  function _(g, { params: m, message: E }, R) {
    const { keyword: O, data: T, schemaValue: K, it: J } = g, { opts: ie, propertyName: de, topSchemaRef: pe, schemaPath: q } = J;
    R.push([u.keyword, O], [u.params, typeof m == "function" ? m(g) : m || (0, t._)`{}`]), ie.messages && R.push([u.message, typeof E == "function" ? E(g) : E]), ie.verbose && R.push([u.schema, K], [u.parentSchema, (0, t._)`${pe}${q}`], [n.default.data, T]), de && R.push([u.propertyName, de]);
  }
})(sn);
Object.defineProperty(Sr, "__esModule", { value: !0 });
Sr.boolOrEmptySchema = Sr.topBoolOrEmptySchema = void 0;
const Gy = sn, Hy = ne, By = mt, Xy = {
  message: "boolean schema is false"
};
function Jy(e) {
  const { gen: t, schema: r, validateName: n } = e;
  r === !1 ? Hl(e, !1) : typeof r == "object" && r.$async === !0 ? t.return(By.default.data) : (t.assign((0, Hy._)`${n}.errors`, null), t.return(!0));
}
Sr.topBoolOrEmptySchema = Jy;
function Wy(e, t) {
  const { gen: r, schema: n } = e;
  n === !1 ? (r.var(t, !1), Hl(e)) : r.var(t, !0);
}
Sr.boolOrEmptySchema = Wy;
function Hl(e, t) {
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
  (0, Gy.reportError)(s, Xy, void 0, t);
}
var Ee = {}, sr = {};
Object.defineProperty(sr, "__esModule", { value: !0 });
sr.getRules = sr.isJSONType = void 0;
const Yy = ["string", "number", "integer", "boolean", "null", "object", "array"], Qy = new Set(Yy);
function Zy(e) {
  return typeof e == "string" && Qy.has(e);
}
sr.isJSONType = Zy;
function xy() {
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
sr.getRules = xy;
var wt = {};
Object.defineProperty(wt, "__esModule", { value: !0 });
wt.shouldUseRule = wt.shouldUseGroup = wt.schemaHasRulesForType = void 0;
function e0({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && Bl(e, n);
}
wt.schemaHasRulesForType = e0;
function Bl(e, t) {
  return t.rules.some((r) => Xl(e, r));
}
wt.shouldUseGroup = Bl;
function Xl(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
wt.shouldUseRule = Xl;
Object.defineProperty(Ee, "__esModule", { value: !0 });
Ee.reportTypeError = Ee.checkDataTypes = Ee.checkDataType = Ee.coerceAndCheckDataType = Ee.getJSONTypes = Ee.getSchemaTypes = Ee.DataType = void 0;
const t0 = sr, r0 = wt, n0 = sn, re = ne, Jl = L;
var _r;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(_r || (Ee.DataType = _r = {}));
function s0(e) {
  const t = Wl(e.type);
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
Ee.getSchemaTypes = s0;
function Wl(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(t0.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
Ee.getJSONTypes = Wl;
function a0(e, t) {
  const { gen: r, data: n, opts: s } = e, a = o0(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, r0.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const l = ho(t, n, s.strictNumbers, _r.Wrong);
    r.if(l, () => {
      a.length ? i0(e, t, a) : mo(e);
    });
  }
  return o;
}
Ee.coerceAndCheckDataType = a0;
const Yl = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function o0(e, t) {
  return t ? e.filter((r) => Yl.has(r) || t === "array" && r === "array") : [];
}
function i0(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, re._)`typeof ${s}`), l = n.let("coerced", (0, re._)`undefined`);
  a.coerceTypes === "array" && n.if((0, re._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, re._)`${s}[0]`).assign(o, (0, re._)`typeof ${s}`).if(ho(t, s, a.strictNumbers), () => n.assign(l, s))), n.if((0, re._)`${l} !== undefined`);
  for (const d of r)
    (Yl.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), mo(e), n.endIf(), n.if((0, re._)`${l} !== undefined`, () => {
    n.assign(s, l), c0(e, l);
  });
  function c(d) {
    switch (d) {
      case "string":
        n.elseIf((0, re._)`${o} == "number" || ${o} == "boolean"`).assign(l, (0, re._)`"" + ${s}`).elseIf((0, re._)`${s} === null`).assign(l, (0, re._)`""`);
        return;
      case "number":
        n.elseIf((0, re._)`${o} == "boolean" || ${s} === null
              || (${o} == "string" && ${s} && ${s} == +${s})`).assign(l, (0, re._)`+${s}`);
        return;
      case "integer":
        n.elseIf((0, re._)`${o} === "boolean" || ${s} === null
              || (${o} === "string" && ${s} && ${s} == +${s} && !(${s} % 1))`).assign(l, (0, re._)`+${s}`);
        return;
      case "boolean":
        n.elseIf((0, re._)`${s} === "false" || ${s} === 0 || ${s} === null`).assign(l, !1).elseIf((0, re._)`${s} === "true" || ${s} === 1`).assign(l, !0);
        return;
      case "null":
        n.elseIf((0, re._)`${s} === "" || ${s} === 0 || ${s} === false`), n.assign(l, null);
        return;
      case "array":
        n.elseIf((0, re._)`${o} === "string" || ${o} === "number"
              || ${o} === "boolean" || ${s} === null`).assign(l, (0, re._)`[${s}]`);
    }
  }
}
function c0({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, re._)`${t} !== undefined`, () => e.assign((0, re._)`${t}[${r}]`, n));
}
function Zs(e, t, r, n = _r.Correct) {
  const s = n === _r.Correct ? re.operators.EQ : re.operators.NEQ;
  let a;
  switch (e) {
    case "null":
      return (0, re._)`${t} ${s} null`;
    case "array":
      a = (0, re._)`Array.isArray(${t})`;
      break;
    case "object":
      a = (0, re._)`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
      break;
    case "integer":
      a = o((0, re._)`!(${t} % 1) && !isNaN(${t})`);
      break;
    case "number":
      a = o();
      break;
    default:
      return (0, re._)`typeof ${t} ${s} ${e}`;
  }
  return n === _r.Correct ? a : (0, re.not)(a);
  function o(l = re.nil) {
    return (0, re.and)((0, re._)`typeof ${t} == "number"`, l, r ? (0, re._)`isFinite(${t})` : re.nil);
  }
}
Ee.checkDataType = Zs;
function ho(e, t, r, n) {
  if (e.length === 1)
    return Zs(e[0], t, r, n);
  let s;
  const a = (0, Jl.toHash)(e);
  if (a.array && a.object) {
    const o = (0, re._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, re._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = re.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, re.and)(s, Zs(o, t, r, n));
  return s;
}
Ee.checkDataTypes = ho;
const l0 = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, re._)`{type: ${e}}` : (0, re._)`{type: ${t}}`
};
function mo(e) {
  const t = u0(e);
  (0, n0.reportError)(t, l0);
}
Ee.reportTypeError = mo;
function u0(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, Jl.schemaRefOrVal)(e, n, "type");
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
var os = {};
Object.defineProperty(os, "__esModule", { value: !0 });
os.assignDefaults = void 0;
const cr = ne, d0 = L;
function f0(e, t) {
  const { properties: r, items: n } = e.schema;
  if (t === "object" && r)
    for (const s in r)
      Xi(e, s, r[s].default);
  else t === "array" && Array.isArray(n) && n.forEach((s, a) => Xi(e, a, s.default));
}
os.assignDefaults = f0;
function Xi(e, t, r) {
  const { gen: n, compositeRule: s, data: a, opts: o } = e;
  if (r === void 0)
    return;
  const l = (0, cr._)`${a}${(0, cr.getProperty)(t)}`;
  if (s) {
    (0, d0.checkStrictMode)(e, `default is ignored for: ${l}`);
    return;
  }
  let c = (0, cr._)`${l} === undefined`;
  o.useDefaults === "empty" && (c = (0, cr._)`${c} || ${l} === null || ${l} === ""`), n.if(c, (0, cr._)`${l} = ${(0, cr.stringify)(r)}`);
}
var ht = {}, oe = {};
Object.defineProperty(oe, "__esModule", { value: !0 });
oe.validateUnion = oe.validateArray = oe.usePattern = oe.callValidateCode = oe.schemaProperties = oe.allSchemaProperties = oe.noPropertyInData = oe.propertyInData = oe.isOwnProperty = oe.hasPropFunc = oe.reportMissingProp = oe.checkMissingProp = oe.checkReportMissingProp = void 0;
const he = ne, po = L, It = mt, h0 = L;
function m0(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if(yo(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, he._)`${t}` }, !0), e.error();
  });
}
oe.checkReportMissingProp = m0;
function p0({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, he.or)(...n.map((a) => (0, he.and)(yo(e, t, a, r.ownProperties), (0, he._)`${s} = ${a}`)));
}
oe.checkMissingProp = p0;
function $0(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
oe.reportMissingProp = $0;
function Ql(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, he._)`Object.prototype.hasOwnProperty`
  });
}
oe.hasPropFunc = Ql;
function $o(e, t, r) {
  return (0, he._)`${Ql(e)}.call(${t}, ${r})`;
}
oe.isOwnProperty = $o;
function y0(e, t, r, n) {
  const s = (0, he._)`${t}${(0, he.getProperty)(r)} !== undefined`;
  return n ? (0, he._)`${s} && ${$o(e, t, r)}` : s;
}
oe.propertyInData = y0;
function yo(e, t, r, n) {
  const s = (0, he._)`${t}${(0, he.getProperty)(r)} === undefined`;
  return n ? (0, he.or)(s, (0, he.not)($o(e, t, r))) : s;
}
oe.noPropertyInData = yo;
function Zl(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
oe.allSchemaProperties = Zl;
function g0(e, t) {
  return Zl(t).filter((r) => !(0, po.alwaysValidSchema)(e, t[r]));
}
oe.schemaProperties = g0;
function _0({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, l, c, d) {
  const u = d ? (0, he._)`${e}, ${t}, ${n}${s}` : t, h = [
    [It.default.instancePath, (0, he.strConcat)(It.default.instancePath, a)],
    [It.default.parentData, o.parentData],
    [It.default.parentDataProperty, o.parentDataProperty],
    [It.default.rootData, It.default.rootData]
  ];
  o.opts.dynamicRef && h.push([It.default.dynamicAnchors, It.default.dynamicAnchors]);
  const w = (0, he._)`${u}, ${r.object(...h)}`;
  return c !== he.nil ? (0, he._)`${l}.call(${c}, ${w})` : (0, he._)`${l}(${w})`;
}
oe.callValidateCode = _0;
const v0 = (0, he._)`new RegExp`;
function w0({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, he._)`${s.code === "new RegExp" ? v0 : (0, h0.useFunc)(e, s)}(${r}, ${n})`
  });
}
oe.usePattern = w0;
function E0(e) {
  const { gen: t, data: r, keyword: n, it: s } = e, a = t.name("valid");
  if (s.allErrors) {
    const l = t.let("valid", !0);
    return o(() => t.assign(l, !1)), l;
  }
  return t.var(a, !0), o(() => t.break()), a;
  function o(l) {
    const c = t.const("len", (0, he._)`${r}.length`);
    t.forRange("i", 0, c, (d) => {
      e.subschema({
        keyword: n,
        dataProp: d,
        dataPropType: po.Type.Num
      }, a), t.if((0, he.not)(a), l);
    });
  }
}
oe.validateArray = E0;
function b0(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, po.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
    return;
  const o = t.let("valid", !1), l = t.name("_valid");
  t.block(() => r.forEach((c, d) => {
    const u = e.subschema({
      keyword: n,
      schemaProp: d,
      compositeRule: !0
    }, l);
    t.assign(o, (0, he._)`${o} || ${l}`), e.mergeValidEvaluated(u, l) || t.if((0, he.not)(o));
  })), e.result(o, () => e.reset(), () => e.error(!0));
}
oe.validateUnion = b0;
Object.defineProperty(ht, "__esModule", { value: !0 });
ht.validateKeywordUsage = ht.validSchemaType = ht.funcKeywordCode = ht.macroKeywordCode = void 0;
const Le = ne, Wt = mt, S0 = oe, P0 = sn;
function N0(e, t) {
  const { gen: r, keyword: n, schema: s, parentSchema: a, it: o } = e, l = t.macro.call(o.self, s, a, o), c = xl(r, n, l);
  o.opts.validateSchema !== !1 && o.self.validateSchema(l, !0);
  const d = r.name("valid");
  e.subschema({
    schema: l,
    schemaPath: Le.nil,
    errSchemaPath: `${o.errSchemaPath}/${n}`,
    topSchemaRef: c,
    compositeRule: !0
  }, d), e.pass(d, () => e.error(!0));
}
ht.macroKeywordCode = N0;
function R0(e, t) {
  var r;
  const { gen: n, keyword: s, schema: a, parentSchema: o, $data: l, it: c } = e;
  I0(c, t);
  const d = !l && t.compile ? t.compile.call(c.self, a, o, c) : t.validate, u = xl(n, s, d), h = n.let("valid");
  e.block$data(h, w), e.ok((r = t.valid) !== null && r !== void 0 ? r : h);
  function w() {
    if (t.errors === !1)
      _(), t.modifying && Ji(e), g(() => e.error());
    else {
      const m = t.async ? y() : v();
      t.modifying && Ji(e), g(() => O0(e, m));
    }
  }
  function y() {
    const m = n.let("ruleErrs", null);
    return n.try(() => _((0, Le._)`await `), (E) => n.assign(h, !1).if((0, Le._)`${E} instanceof ${c.ValidationError}`, () => n.assign(m, (0, Le._)`${E}.errors`), () => n.throw(E))), m;
  }
  function v() {
    const m = (0, Le._)`${u}.errors`;
    return n.assign(m, null), _(Le.nil), m;
  }
  function _(m = t.async ? (0, Le._)`await ` : Le.nil) {
    const E = c.opts.passContext ? Wt.default.this : Wt.default.self, R = !("compile" in t && !l || t.schema === !1);
    n.assign(h, (0, Le._)`${m}${(0, S0.callValidateCode)(e, u, E, R)}`, t.modifying);
  }
  function g(m) {
    var E;
    n.if((0, Le.not)((E = t.valid) !== null && E !== void 0 ? E : h), m);
  }
}
ht.funcKeywordCode = R0;
function Ji(e) {
  const { gen: t, data: r, it: n } = e;
  t.if(n.parentData, () => t.assign(r, (0, Le._)`${n.parentData}[${n.parentDataProperty}]`));
}
function O0(e, t) {
  const { gen: r } = e;
  r.if((0, Le._)`Array.isArray(${t})`, () => {
    r.assign(Wt.default.vErrors, (0, Le._)`${Wt.default.vErrors} === null ? ${t} : ${Wt.default.vErrors}.concat(${t})`).assign(Wt.default.errors, (0, Le._)`${Wt.default.vErrors}.length`), (0, P0.extendErrors)(e);
  }, () => e.error());
}
function I0({ schemaEnv: e }, t) {
  if (t.async && !e.$async)
    throw new Error("async keyword in sync schema");
}
function xl(e, t, r) {
  if (r === void 0)
    throw new Error(`keyword "${t}" failed to compile`);
  return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, Le.stringify)(r) });
}
function T0(e, t, r = !1) {
  return !t.length || t.some((n) => n === "array" ? Array.isArray(e) : n === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == n || r && typeof e > "u");
}
ht.validSchemaType = T0;
function j0({ schema: e, opts: t, self: r, errSchemaPath: n }, s, a) {
  if (Array.isArray(s.keyword) ? !s.keyword.includes(a) : s.keyword !== a)
    throw new Error("ajv implementation error");
  const o = s.dependencies;
  if (o != null && o.some((l) => !Object.prototype.hasOwnProperty.call(e, l)))
    throw new Error(`parent schema must have dependencies of ${a}: ${o.join(",")}`);
  if (s.validateSchema && !s.validateSchema(e[a])) {
    const c = `keyword "${a}" value is invalid at path "${n}": ` + r.errorsText(s.validateSchema.errors);
    if (t.validateSchema === "log")
      r.logger.error(c);
    else
      throw new Error(c);
  }
}
ht.validateKeywordUsage = j0;
var Ft = {};
Object.defineProperty(Ft, "__esModule", { value: !0 });
Ft.extendSubschemaMode = Ft.extendSubschemaData = Ft.getSubschema = void 0;
const dt = ne, eu = L;
function A0(e, { keyword: t, schemaProp: r, schema: n, schemaPath: s, errSchemaPath: a, topSchemaRef: o }) {
  if (t !== void 0 && n !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (t !== void 0) {
    const l = e.schema[t];
    return r === void 0 ? {
      schema: l,
      schemaPath: (0, dt._)`${e.schemaPath}${(0, dt.getProperty)(t)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}`
    } : {
      schema: l[r],
      schemaPath: (0, dt._)`${e.schemaPath}${(0, dt.getProperty)(t)}${(0, dt.getProperty)(r)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}/${(0, eu.escapeFragment)(r)}`
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
Ft.getSubschema = A0;
function k0(e, t, { dataProp: r, dataPropType: n, data: s, dataTypes: a, propertyName: o }) {
  if (s !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: l } = t;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: u, opts: h } = t, w = l.let("data", (0, dt._)`${t.data}${(0, dt.getProperty)(r)}`, !0);
    c(w), e.errorPath = (0, dt.str)`${d}${(0, eu.getErrorPath)(r, n, h.jsPropertySyntax)}`, e.parentDataProperty = (0, dt._)`${r}`, e.dataPathArr = [...u, e.parentDataProperty];
  }
  if (s !== void 0) {
    const d = s instanceof dt.Name ? s : l.let("data", s, !0);
    c(d), o !== void 0 && (e.propertyName = o);
  }
  a && (e.dataTypes = a);
  function c(d) {
    e.data = d, e.dataLevel = t.dataLevel + 1, e.dataTypes = [], t.definedProperties = /* @__PURE__ */ new Set(), e.parentData = t.data, e.dataNames = [...t.dataNames, d];
  }
}
Ft.extendSubschemaData = k0;
function C0(e, { jtdDiscriminator: t, jtdMetadata: r, compositeRule: n, createErrors: s, allErrors: a }) {
  n !== void 0 && (e.compositeRule = n), s !== void 0 && (e.createErrors = s), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = r;
}
Ft.extendSubschemaMode = C0;
var Ie = {}, tu = { exports: {} }, Lt = tu.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  Vn(t, n, s, e, "", e);
};
Lt.keywords = {
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
Lt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Lt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Lt.skipKeywords = {
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
function Vn(e, t, r, n, s, a, o, l, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, l, c, d);
    for (var u in n) {
      var h = n[u];
      if (Array.isArray(h)) {
        if (u in Lt.arrayKeywords)
          for (var w = 0; w < h.length; w++)
            Vn(e, t, r, h[w], s + "/" + u + "/" + w, a, s, u, n, w);
      } else if (u in Lt.propsKeywords) {
        if (h && typeof h == "object")
          for (var y in h)
            Vn(e, t, r, h[y], s + "/" + u + "/" + D0(y), a, s, u, n, y);
      } else (u in Lt.keywords || e.allKeys && !(u in Lt.skipKeywords)) && Vn(e, t, r, h, s + "/" + u, a, s, u, n);
    }
    r(n, s, a, o, l, c, d);
  }
}
function D0(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var M0 = tu.exports;
Object.defineProperty(Ie, "__esModule", { value: !0 });
Ie.getSchemaRefs = Ie.resolveUrl = Ie.normalizeId = Ie._getFullPath = Ie.getFullPath = Ie.inlineRef = void 0;
const V0 = L, L0 = Zn, F0 = M0, z0 = /* @__PURE__ */ new Set([
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
function U0(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !xs(e) : t ? ru(e) <= t : !1;
}
Ie.inlineRef = U0;
const q0 = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function xs(e) {
  for (const t in e) {
    if (q0.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(xs) || typeof r == "object" && xs(r))
      return !0;
  }
  return !1;
}
function ru(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !z0.has(r) && (typeof e[r] == "object" && (0, V0.eachItem)(e[r], (n) => t += ru(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function nu(e, t = "", r) {
  r !== !1 && (t = vr(t));
  const n = e.parse(t);
  return su(e, n);
}
Ie.getFullPath = nu;
function su(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
Ie._getFullPath = su;
const K0 = /#\/?$/;
function vr(e) {
  return e ? e.replace(K0, "") : "";
}
Ie.normalizeId = vr;
function G0(e, t, r) {
  return r = vr(r), e.resolve(t, r);
}
Ie.resolveUrl = G0;
const H0 = /^[a-z_][-a-z0-9._]*$/i;
function B0(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = vr(e[r] || t), a = { "": s }, o = nu(n, s, !1), l = {}, c = /* @__PURE__ */ new Set();
  return F0(e, { allKeys: !0 }, (h, w, y, v) => {
    if (v === void 0)
      return;
    const _ = o + w;
    let g = a[v];
    typeof h[r] == "string" && (g = m.call(this, h[r])), E.call(this, h.$anchor), E.call(this, h.$dynamicAnchor), a[w] = g;
    function m(R) {
      const O = this.opts.uriResolver.resolve;
      if (R = vr(g ? O(g, R) : R), c.has(R))
        throw u(R);
      c.add(R);
      let T = this.refs[R];
      return typeof T == "string" && (T = this.refs[T]), typeof T == "object" ? d(h, T.schema, R) : R !== vr(_) && (R[0] === "#" ? (d(h, l[R], R), l[R] = h) : this.refs[R] = _), R;
    }
    function E(R) {
      if (typeof R == "string") {
        if (!H0.test(R))
          throw new Error(`invalid anchor "${R}"`);
        m.call(this, `#${R}`);
      }
    }
  }), l;
  function d(h, w, y) {
    if (w !== void 0 && !L0(h, w))
      throw u(y);
  }
  function u(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
Ie.getSchemaRefs = B0;
Object.defineProperty(st, "__esModule", { value: !0 });
st.getData = st.KeywordCxt = st.validateFunctionCode = void 0;
const au = Sr, Wi = Ee, go = wt, Xn = Ee, X0 = os, Jr = ht, Ns = Ft, B = ne, Y = mt, J0 = Ie, Et = L, Fr = sn;
function W0(e) {
  if (cu(e) && (lu(e), iu(e))) {
    Z0(e);
    return;
  }
  ou(e, () => (0, au.topBoolOrEmptySchema)(e));
}
st.validateFunctionCode = W0;
function ou({ gen: e, validateName: t, schema: r, schemaEnv: n, opts: s }, a) {
  s.code.es5 ? e.func(t, (0, B._)`${Y.default.data}, ${Y.default.valCxt}`, n.$async, () => {
    e.code((0, B._)`"use strict"; ${Yi(r, s)}`), Q0(e, s), e.code(a);
  }) : e.func(t, (0, B._)`${Y.default.data}, ${Y0(s)}`, n.$async, () => e.code(Yi(r, s)).code(a));
}
function Y0(e) {
  return (0, B._)`{${Y.default.instancePath}="", ${Y.default.parentData}, ${Y.default.parentDataProperty}, ${Y.default.rootData}=${Y.default.data}${e.dynamicRef ? (0, B._)`, ${Y.default.dynamicAnchors}={}` : B.nil}}={}`;
}
function Q0(e, t) {
  e.if(Y.default.valCxt, () => {
    e.var(Y.default.instancePath, (0, B._)`${Y.default.valCxt}.${Y.default.instancePath}`), e.var(Y.default.parentData, (0, B._)`${Y.default.valCxt}.${Y.default.parentData}`), e.var(Y.default.parentDataProperty, (0, B._)`${Y.default.valCxt}.${Y.default.parentDataProperty}`), e.var(Y.default.rootData, (0, B._)`${Y.default.valCxt}.${Y.default.rootData}`), t.dynamicRef && e.var(Y.default.dynamicAnchors, (0, B._)`${Y.default.valCxt}.${Y.default.dynamicAnchors}`);
  }, () => {
    e.var(Y.default.instancePath, (0, B._)`""`), e.var(Y.default.parentData, (0, B._)`undefined`), e.var(Y.default.parentDataProperty, (0, B._)`undefined`), e.var(Y.default.rootData, Y.default.data), t.dynamicRef && e.var(Y.default.dynamicAnchors, (0, B._)`{}`);
  });
}
function Z0(e) {
  const { schema: t, opts: r, gen: n } = e;
  ou(e, () => {
    r.$comment && t.$comment && du(e), ng(e), n.let(Y.default.vErrors, null), n.let(Y.default.errors, 0), r.unevaluated && x0(e), uu(e), og(e);
  });
}
function x0(e) {
  const { gen: t, validateName: r } = e;
  e.evaluated = t.const("evaluated", (0, B._)`${r}.evaluated`), t.if((0, B._)`${e.evaluated}.dynamicProps`, () => t.assign((0, B._)`${e.evaluated}.props`, (0, B._)`undefined`)), t.if((0, B._)`${e.evaluated}.dynamicItems`, () => t.assign((0, B._)`${e.evaluated}.items`, (0, B._)`undefined`));
}
function Yi(e, t) {
  const r = typeof e == "object" && e[t.schemaId];
  return r && (t.code.source || t.code.process) ? (0, B._)`/*# sourceURL=${r} */` : B.nil;
}
function eg(e, t) {
  if (cu(e) && (lu(e), iu(e))) {
    tg(e, t);
    return;
  }
  (0, au.boolOrEmptySchema)(e, t);
}
function iu({ schema: e, self: t }) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t.RULES.all[r])
      return !0;
  return !1;
}
function cu(e) {
  return typeof e.schema != "boolean";
}
function tg(e, t) {
  const { schema: r, gen: n, opts: s } = e;
  s.$comment && r.$comment && du(e), sg(e), ag(e);
  const a = n.const("_errs", Y.default.errors);
  uu(e, a), n.var(t, (0, B._)`${a} === ${Y.default.errors}`);
}
function lu(e) {
  (0, Et.checkUnknownRules)(e), rg(e);
}
function uu(e, t) {
  if (e.opts.jtd)
    return Qi(e, [], !1, t);
  const r = (0, Wi.getSchemaTypes)(e.schema), n = (0, Wi.coerceAndCheckDataType)(e, r);
  Qi(e, r, !n, t);
}
function rg(e) {
  const { schema: t, errSchemaPath: r, opts: n, self: s } = e;
  t.$ref && n.ignoreKeywordsWithRef && (0, Et.schemaHasRulesButRef)(t, s.RULES) && s.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function ng(e) {
  const { schema: t, opts: r } = e;
  t.default !== void 0 && r.useDefaults && r.strictSchema && (0, Et.checkStrictMode)(e, "default is ignored in the schema root");
}
function sg(e) {
  const t = e.schema[e.opts.schemaId];
  t && (e.baseId = (0, J0.resolveUrl)(e.opts.uriResolver, e.baseId, t));
}
function ag(e) {
  if (e.schema.$async && !e.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function du({ gen: e, schemaEnv: t, schema: r, errSchemaPath: n, opts: s }) {
  const a = r.$comment;
  if (s.$comment === !0)
    e.code((0, B._)`${Y.default.self}.logger.log(${a})`);
  else if (typeof s.$comment == "function") {
    const o = (0, B.str)`${n}/$comment`, l = e.scopeValue("root", { ref: t.root });
    e.code((0, B._)`${Y.default.self}.opts.$comment(${a}, ${o}, ${l}.schema)`);
  }
}
function og(e) {
  const { gen: t, schemaEnv: r, validateName: n, ValidationError: s, opts: a } = e;
  r.$async ? t.if((0, B._)`${Y.default.errors} === 0`, () => t.return(Y.default.data), () => t.throw((0, B._)`new ${s}(${Y.default.vErrors})`)) : (t.assign((0, B._)`${n}.errors`, Y.default.vErrors), a.unevaluated && ig(e), t.return((0, B._)`${Y.default.errors} === 0`));
}
function ig({ gen: e, evaluated: t, props: r, items: n }) {
  r instanceof B.Name && e.assign((0, B._)`${t}.props`, r), n instanceof B.Name && e.assign((0, B._)`${t}.items`, n);
}
function Qi(e, t, r, n) {
  const { gen: s, schema: a, data: o, allErrors: l, opts: c, self: d } = e, { RULES: u } = d;
  if (a.$ref && (c.ignoreKeywordsWithRef || !(0, Et.schemaHasRulesButRef)(a, u))) {
    s.block(() => mu(e, "$ref", u.all.$ref.definition));
    return;
  }
  c.jtd || cg(e, t), s.block(() => {
    for (const w of u.rules)
      h(w);
    h(u.post);
  });
  function h(w) {
    (0, go.shouldUseGroup)(a, w) && (w.type ? (s.if((0, Xn.checkDataType)(w.type, o, c.strictNumbers)), Zi(e, w), t.length === 1 && t[0] === w.type && r && (s.else(), (0, Xn.reportTypeError)(e)), s.endIf()) : Zi(e, w), l || s.if((0, B._)`${Y.default.errors} === ${n || 0}`));
  }
}
function Zi(e, t) {
  const { gen: r, schema: n, opts: { useDefaults: s } } = e;
  s && (0, X0.assignDefaults)(e, t.type), r.block(() => {
    for (const a of t.rules)
      (0, go.shouldUseRule)(n, a) && mu(e, a.keyword, a.definition, t.type);
  });
}
function cg(e, t) {
  e.schemaEnv.meta || !e.opts.strictTypes || (lg(e, t), e.opts.allowUnionTypes || ug(e, t), dg(e, e.dataTypes));
}
function lg(e, t) {
  if (t.length) {
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    t.forEach((r) => {
      fu(e.dataTypes, r) || _o(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }), hg(e, t);
  }
}
function ug(e, t) {
  t.length > 1 && !(t.length === 2 && t.includes("null")) && _o(e, "use allowUnionTypes to allow union type keyword");
}
function dg(e, t) {
  const r = e.self.RULES.all;
  for (const n in r) {
    const s = r[n];
    if (typeof s == "object" && (0, go.shouldUseRule)(e.schema, s)) {
      const { type: a } = s.definition;
      a.length && !a.some((o) => fg(t, o)) && _o(e, `missing type "${a.join(",")}" for keyword "${n}"`);
    }
  }
}
function fg(e, t) {
  return e.includes(t) || t === "number" && e.includes("integer");
}
function fu(e, t) {
  return e.includes(t) || t === "integer" && e.includes("number");
}
function hg(e, t) {
  const r = [];
  for (const n of e.dataTypes)
    fu(t, n) ? r.push(n) : t.includes("integer") && n === "number" && r.push("integer");
  e.dataTypes = r;
}
function _o(e, t) {
  const r = e.schemaEnv.baseId + e.errSchemaPath;
  t += ` at "${r}" (strictTypes)`, (0, Et.checkStrictMode)(e, t, e.opts.strictTypes);
}
class hu {
  constructor(t, r, n) {
    if ((0, Jr.validateKeywordUsage)(t, r, n), this.gen = t.gen, this.allErrors = t.allErrors, this.keyword = n, this.data = t.data, this.schema = t.schema[n], this.$data = r.$data && t.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, Et.schemaRefOrVal)(t, this.schema, n, this.$data), this.schemaType = r.schemaType, this.parentSchema = t.schema, this.params = {}, this.it = t, this.def = r, this.$data)
      this.schemaCode = t.gen.const("vSchema", pu(this.$data, t));
    else if (this.schemaCode = this.schemaValue, !(0, Jr.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${n} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = t.gen.const("_errs", Y.default.errors));
  }
  result(t, r, n) {
    this.failResult((0, B.not)(t), r, n);
  }
  failResult(t, r, n) {
    this.gen.if(t), n ? n() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(t, r) {
    this.failResult((0, B.not)(t), void 0, r);
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
    this.fail((0, B._)`${r} !== undefined && (${(0, B.or)(this.invalid$data(), t)})`);
  }
  error(t, r, n) {
    if (r) {
      this.setParams(r), this._error(t, n), this.setParams({});
      return;
    }
    this._error(t, n);
  }
  _error(t, r) {
    (t ? Fr.reportExtraError : Fr.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, Fr.reportError)(this, this.def.$dataError || Fr.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, Fr.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(t) {
    this.allErrors || this.gen.if(t);
  }
  setParams(t, r) {
    r ? Object.assign(this.params, t) : this.params = t;
  }
  block$data(t, r, n = B.nil) {
    this.gen.block(() => {
      this.check$data(t, n), r();
    });
  }
  check$data(t = B.nil, r = B.nil) {
    if (!this.$data)
      return;
    const { gen: n, schemaCode: s, schemaType: a, def: o } = this;
    n.if((0, B.or)((0, B._)`${s} === undefined`, r)), t !== B.nil && n.assign(t, !0), (a.length || o.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), t !== B.nil && n.assign(t, !1)), n.else();
  }
  invalid$data() {
    const { gen: t, schemaCode: r, schemaType: n, def: s, it: a } = this;
    return (0, B.or)(o(), l());
    function o() {
      if (n.length) {
        if (!(r instanceof B.Name))
          throw new Error("ajv implementation error");
        const c = Array.isArray(n) ? n : [n];
        return (0, B._)`${(0, Xn.checkDataTypes)(c, r, a.opts.strictNumbers, Xn.DataType.Wrong)}`;
      }
      return B.nil;
    }
    function l() {
      if (s.validateSchema) {
        const c = t.scopeValue("validate$data", { ref: s.validateSchema });
        return (0, B._)`!${c}(${r})`;
      }
      return B.nil;
    }
  }
  subschema(t, r) {
    const n = (0, Ns.getSubschema)(this.it, t);
    (0, Ns.extendSubschemaData)(n, this.it, t), (0, Ns.extendSubschemaMode)(n, t);
    const s = { ...this.it, ...n, items: void 0, props: void 0 };
    return eg(s, r), s;
  }
  mergeEvaluated(t, r) {
    const { it: n, gen: s } = this;
    n.opts.unevaluated && (n.props !== !0 && t.props !== void 0 && (n.props = Et.mergeEvaluated.props(s, t.props, n.props, r)), n.items !== !0 && t.items !== void 0 && (n.items = Et.mergeEvaluated.items(s, t.items, n.items, r)));
  }
  mergeValidEvaluated(t, r) {
    const { it: n, gen: s } = this;
    if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0))
      return s.if(r, () => this.mergeEvaluated(t, B.Name)), !0;
  }
}
st.KeywordCxt = hu;
function mu(e, t, r, n) {
  const s = new hu(e, r, t);
  "code" in r ? r.code(s, n) : s.$data && r.validate ? (0, Jr.funcKeywordCode)(s, r) : "macro" in r ? (0, Jr.macroKeywordCode)(s, r) : (r.compile || r.validate) && (0, Jr.funcKeywordCode)(s, r);
}
const mg = /^\/(?:[^~]|~0|~1)*$/, pg = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function pu(e, { dataLevel: t, dataNames: r, dataPathArr: n }) {
  let s, a;
  if (e === "")
    return Y.default.rootData;
  if (e[0] === "/") {
    if (!mg.test(e))
      throw new Error(`Invalid JSON-pointer: ${e}`);
    s = e, a = Y.default.rootData;
  } else {
    const d = pg.exec(e);
    if (!d)
      throw new Error(`Invalid JSON-pointer: ${e}`);
    const u = +d[1];
    if (s = d[2], s === "#") {
      if (u >= t)
        throw new Error(c("property/index", u));
      return n[t - u];
    }
    if (u > t)
      throw new Error(c("data", u));
    if (a = r[t - u], !s)
      return a;
  }
  let o = a;
  const l = s.split("/");
  for (const d of l)
    d && (a = (0, B._)`${a}${(0, B.getProperty)((0, Et.unescapeJsonPointer)(d))}`, o = (0, B._)`${o} && ${a}`);
  return o;
  function c(d, u) {
    return `Cannot access ${d} ${u} levels up, current level is ${t}`;
  }
}
st.getData = pu;
var yn = {}, xi;
function vo() {
  if (xi) return yn;
  xi = 1, Object.defineProperty(yn, "__esModule", { value: !0 });
  class e extends Error {
    constructor(r) {
      super("validation failed"), this.errors = r, this.ajv = this.validation = !0;
    }
  }
  return yn.default = e, yn;
}
var gn = {}, ec;
function is() {
  if (ec) return gn;
  ec = 1, Object.defineProperty(gn, "__esModule", { value: !0 });
  const e = Ie;
  class t extends Error {
    constructor(n, s, a, o) {
      super(o || `can't resolve reference ${a} from id ${s}`), this.missingRef = (0, e.resolveUrl)(n, s, a), this.missingSchema = (0, e.normalizeId)((0, e.getFullPath)(n, this.missingRef));
    }
  }
  return gn.default = t, gn;
}
var Ge = {};
Object.defineProperty(Ge, "__esModule", { value: !0 });
Ge.resolveSchema = Ge.getCompilingSchema = Ge.resolveRef = Ge.compileSchema = Ge.SchemaEnv = void 0;
const xe = ne, $g = vo(), Ht = mt, nt = Ie, tc = L, yg = st;
class cs {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, nt.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
}
Ge.SchemaEnv = cs;
function wo(e) {
  const t = $u.call(this, e);
  if (t)
    return t;
  const r = (0, nt.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new xe.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let l;
  e.$async && (l = o.scopeValue("Error", {
    ref: $g.default,
    code: (0, xe._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = o.scopeName("validate");
  e.validateName = c;
  const d = {
    gen: o,
    allErrors: this.opts.allErrors,
    data: Ht.default.data,
    parentData: Ht.default.parentData,
    parentDataProperty: Ht.default.parentDataProperty,
    dataNames: [Ht.default.data],
    dataPathArr: [xe.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: o.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, xe.stringify)(e.schema) } : { ref: e.schema }),
    validateName: c,
    ValidationError: l,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: xe.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, xe._)`""`,
    opts: this.opts,
    self: this
  };
  let u;
  try {
    this._compilations.add(e), (0, yg.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    u = `${o.scopeRefs(Ht.default.scope)}return ${h}`, this.opts.code.process && (u = this.opts.code.process(u, e));
    const y = new Function(`${Ht.default.self}`, `${Ht.default.scope}`, u)(this, this.scope.get());
    if (this.scope.value(c, { ref: y }), y.errors = null, y.schema = e.schema, y.schemaEnv = e, e.$async && (y.$async = !0), this.opts.code.source === !0 && (y.source = { validateName: c, validateCode: h, scopeValues: o._values }), this.opts.unevaluated) {
      const { props: v, items: _ } = d;
      y.evaluated = {
        props: v instanceof xe.Name ? void 0 : v,
        items: _ instanceof xe.Name ? void 0 : _,
        dynamicProps: v instanceof xe.Name,
        dynamicItems: _ instanceof xe.Name
      }, y.source && (y.source.evaluated = (0, xe.stringify)(y.evaluated));
    }
    return e.validate = y, e;
  } catch (h) {
    throw delete e.validate, delete e.validateName, u && this.logger.error("Error compiling schema, function code:", u), h;
  } finally {
    this._compilations.delete(e);
  }
}
Ge.compileSchema = wo;
function gg(e, t, r) {
  var n;
  r = (0, nt.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = wg.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: l } = this.opts;
    o && (a = new cs({ schema: o, schemaId: l, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = _g.call(this, a);
}
Ge.resolveRef = gg;
function _g(e) {
  return (0, nt.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : wo.call(this, e);
}
function $u(e) {
  for (const t of this._compilations)
    if (vg(t, e))
      return t;
}
Ge.getCompilingSchema = $u;
function vg(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function wg(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || ls.call(this, e, t);
}
function ls(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, nt._getFullPath)(this.opts.uriResolver, r);
  let s = (0, nt.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return Rs.call(this, r, e);
  const a = (0, nt.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const l = ls.call(this, e, o);
    return typeof (l == null ? void 0 : l.schema) != "object" ? void 0 : Rs.call(this, r, l);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || wo.call(this, o), a === (0, nt.normalizeId)(t)) {
      const { schema: l } = o, { schemaId: c } = this.opts, d = l[c];
      return d && (s = (0, nt.resolveUrl)(this.opts.uriResolver, s, d)), new cs({ schema: l, schemaId: c, root: e, baseId: s });
    }
    return Rs.call(this, r, o);
  }
}
Ge.resolveSchema = ls;
const Eg = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function Rs(e, { baseId: t, schema: r, root: n }) {
  var s;
  if (((s = e.fragment) === null || s === void 0 ? void 0 : s[0]) !== "/")
    return;
  for (const l of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, tc.unescapeFragment)(l)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !Eg.has(l) && d && (t = (0, nt.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, tc.schemaHasRulesButRef)(r, this.RULES)) {
    const l = (0, nt.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = ls.call(this, n, l);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new cs({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const bg = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", Sg = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Pg = "object", Ng = [
  "$data"
], Rg = {
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
}, Og = !1, Ig = {
  $id: bg,
  description: Sg,
  type: Pg,
  required: Ng,
  properties: Rg,
  additionalProperties: Og
};
var Eo = {};
Object.defineProperty(Eo, "__esModule", { value: !0 });
const yu = Nl;
yu.code = 'require("ajv/dist/runtime/uri").default';
Eo.default = yu;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = st;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return t.KeywordCxt;
  } });
  var r = ne;
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
  const n = vo(), s = is(), a = sr, o = Ge, l = ne, c = Ie, d = Ee, u = L, h = Ig, w = Eo, y = (P, p) => new RegExp(P, p);
  y.code = "new RegExp";
  const v = ["removeAdditional", "useDefaults", "coerceTypes"], _ = /* @__PURE__ */ new Set([
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
  ]), g = {
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
  }, E = 200;
  function R(P) {
    var p, S, $, i, f, b, j, A, F, U, N, I, k, D, G, Q, $e, Ve, be, Se, ye, ct, Te, zt, Ut;
    const We = P.strict, qt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, kr = qt === !0 || qt === void 0 ? 1 : qt || 0, Cr = ($ = (S = P.code) === null || S === void 0 ? void 0 : S.regExp) !== null && $ !== void 0 ? $ : y, $s = (i = P.uriResolver) !== null && i !== void 0 ? i : w.default;
    return {
      strictSchema: (b = (f = P.strictSchema) !== null && f !== void 0 ? f : We) !== null && b !== void 0 ? b : !0,
      strictNumbers: (A = (j = P.strictNumbers) !== null && j !== void 0 ? j : We) !== null && A !== void 0 ? A : !0,
      strictTypes: (U = (F = P.strictTypes) !== null && F !== void 0 ? F : We) !== null && U !== void 0 ? U : "log",
      strictTuples: (I = (N = P.strictTuples) !== null && N !== void 0 ? N : We) !== null && I !== void 0 ? I : "log",
      strictRequired: (D = (k = P.strictRequired) !== null && k !== void 0 ? k : We) !== null && D !== void 0 ? D : !1,
      code: P.code ? { ...P.code, optimize: kr, regExp: Cr } : { optimize: kr, regExp: Cr },
      loopRequired: (G = P.loopRequired) !== null && G !== void 0 ? G : E,
      loopEnum: (Q = P.loopEnum) !== null && Q !== void 0 ? Q : E,
      meta: ($e = P.meta) !== null && $e !== void 0 ? $e : !0,
      messages: (Ve = P.messages) !== null && Ve !== void 0 ? Ve : !0,
      inlineRefs: (be = P.inlineRefs) !== null && be !== void 0 ? be : !0,
      schemaId: (Se = P.schemaId) !== null && Se !== void 0 ? Se : "$id",
      addUsedSchema: (ye = P.addUsedSchema) !== null && ye !== void 0 ? ye : !0,
      validateSchema: (ct = P.validateSchema) !== null && ct !== void 0 ? ct : !0,
      validateFormats: (Te = P.validateFormats) !== null && Te !== void 0 ? Te : !0,
      unicodeRegExp: (zt = P.unicodeRegExp) !== null && zt !== void 0 ? zt : !0,
      int32range: (Ut = P.int32range) !== null && Ut !== void 0 ? Ut : !0,
      uriResolver: $s
    };
  }
  class O {
    constructor(p = {}) {
      this.schemas = {}, this.refs = {}, this.formats = /* @__PURE__ */ Object.create(null), this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), p = this.opts = { ...p, ...R(p) };
      const { es5: S, lines: $ } = this.opts.code;
      this.scope = new l.ValueScope({ scope: {}, prefixes: _, es5: S, lines: $ }), this.logger = X(p.logger);
      const i = p.validateFormats;
      p.validateFormats = !1, this.RULES = (0, a.getRules)(), T.call(this, g, p, "NOT SUPPORTED"), T.call(this, m, p, "DEPRECATED", "warn"), this._metaOpts = pe.call(this), p.formats && ie.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), p.keywords && de.call(this, p.keywords), typeof p.meta == "object" && this.addMetaSchema(p.meta), J.call(this), p.validateFormats = i;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: p, meta: S, schemaId: $ } = this.opts;
      let i = h;
      $ === "id" && (i = { ...h }, i.id = i.$id, delete i.$id), S && p && this.addMetaSchema(i, i[$], !1);
    }
    defaultMeta() {
      const { meta: p, schemaId: S } = this.opts;
      return this.opts.defaultMeta = typeof p == "object" ? p[S] || p : void 0;
    }
    validate(p, S) {
      let $;
      if (typeof p == "string") {
        if ($ = this.getSchema(p), !$)
          throw new Error(`no schema with key or ref "${p}"`);
      } else
        $ = this.compile(p);
      const i = $(S);
      return "$async" in $ || (this.errors = $.errors), i;
    }
    compile(p, S) {
      const $ = this._addSchema(p, S);
      return $.validate || this._compileSchemaEnv($);
    }
    compileAsync(p, S) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: $ } = this.opts;
      return i.call(this, p, S);
      async function i(U, N) {
        await f.call(this, U.$schema);
        const I = this._addSchema(U, N);
        return I.validate || b.call(this, I);
      }
      async function f(U) {
        U && !this.getSchema(U) && await i.call(this, { $ref: U }, !0);
      }
      async function b(U) {
        try {
          return this._compileSchemaEnv(U);
        } catch (N) {
          if (!(N instanceof s.default))
            throw N;
          return j.call(this, N), await A.call(this, N.missingSchema), b.call(this, U);
        }
      }
      function j({ missingSchema: U, missingRef: N }) {
        if (this.refs[U])
          throw new Error(`AnySchema ${U} is loaded but ${N} cannot be resolved`);
      }
      async function A(U) {
        const N = await F.call(this, U);
        this.refs[U] || await f.call(this, N.$schema), this.refs[U] || this.addSchema(N, U, S);
      }
      async function F(U) {
        const N = this._loading[U];
        if (N)
          return N;
        try {
          return await (this._loading[U] = $(U));
        } finally {
          delete this._loading[U];
        }
      }
    }
    // Adds schema to the instance
    addSchema(p, S, $, i = this.opts.validateSchema) {
      if (Array.isArray(p)) {
        for (const b of p)
          this.addSchema(b, void 0, $, i);
        return this;
      }
      let f;
      if (typeof p == "object") {
        const { schemaId: b } = this.opts;
        if (f = p[b], f !== void 0 && typeof f != "string")
          throw new Error(`schema ${b} must be string`);
      }
      return S = (0, c.normalizeId)(S || f), this._checkUnique(S), this.schemas[S] = this._addSchema(p, $, S, i, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(p, S, $ = this.opts.validateSchema) {
      return this.addSchema(p, S, !0, $), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(p, S) {
      if (typeof p == "boolean")
        return !0;
      let $;
      if ($ = p.$schema, $ !== void 0 && typeof $ != "string")
        throw new Error("$schema must be a string");
      if ($ = $ || this.opts.defaultMeta || this.defaultMeta(), !$)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const i = this.validate($, p);
      if (!i && S) {
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
      let S;
      for (; typeof (S = K.call(this, p)) == "string"; )
        p = S;
      if (S === void 0) {
        const { schemaId: $ } = this.opts, i = new o.SchemaEnv({ schema: {}, schemaId: $ });
        if (S = o.resolveSchema.call(this, i, p), !S)
          return;
        this.refs[p] = S;
      }
      return S.validate || this._compileSchemaEnv(S);
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
          const S = K.call(this, p);
          return typeof S == "object" && this._cache.delete(S.schema), delete this.schemas[p], delete this.refs[p], this;
        }
        case "object": {
          const S = p;
          this._cache.delete(S);
          let $ = p[this.opts.schemaId];
          return $ && ($ = (0, c.normalizeId)($), delete this.schemas[$], delete this.refs[$]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(p) {
      for (const S of p)
        this.addKeyword(S);
      return this;
    }
    addKeyword(p, S) {
      let $;
      if (typeof p == "string")
        $ = p, typeof S == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), S.keyword = $);
      else if (typeof p == "object" && S === void 0) {
        if (S = p, $ = S.keyword, Array.isArray($) && !$.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (H.call(this, $, S), !S)
        return (0, u.eachItem)($, (f) => ce.call(this, f)), this;
      M.call(this, S);
      const i = {
        ...S,
        type: (0, d.getJSONTypes)(S.type),
        schemaType: (0, d.getJSONTypes)(S.schemaType)
      };
      return (0, u.eachItem)($, i.type.length === 0 ? (f) => ce.call(this, f, i) : (f) => i.type.forEach((b) => ce.call(this, f, i, b))), this;
    }
    getKeyword(p) {
      const S = this.RULES.all[p];
      return typeof S == "object" ? S.definition : !!S;
    }
    // Remove keyword
    removeKeyword(p) {
      const { RULES: S } = this;
      delete S.keywords[p], delete S.all[p];
      for (const $ of S.rules) {
        const i = $.rules.findIndex((f) => f.keyword === p);
        i >= 0 && $.rules.splice(i, 1);
      }
      return this;
    }
    // Add format
    addFormat(p, S) {
      return typeof S == "string" && (S = new RegExp(S)), this.formats[p] = S, this;
    }
    errorsText(p = this.errors, { separator: S = ", ", dataVar: $ = "data" } = {}) {
      return !p || p.length === 0 ? "No errors" : p.map((i) => `${$}${i.instancePath} ${i.message}`).reduce((i, f) => i + S + f);
    }
    $dataMetaSchema(p, S) {
      const $ = this.RULES.all;
      p = JSON.parse(JSON.stringify(p));
      for (const i of S) {
        const f = i.split("/").slice(1);
        let b = p;
        for (const j of f)
          b = b[j];
        for (const j in $) {
          const A = $[j];
          if (typeof A != "object")
            continue;
          const { $data: F } = A.definition, U = b[j];
          F && U && (b[j] = z(U));
        }
      }
      return p;
    }
    _removeAllSchemas(p, S) {
      for (const $ in p) {
        const i = p[$];
        (!S || S.test($)) && (typeof i == "string" ? delete p[$] : i && !i.meta && (this._cache.delete(i.schema), delete p[$]));
      }
    }
    _addSchema(p, S, $, i = this.opts.validateSchema, f = this.opts.addUsedSchema) {
      let b;
      const { schemaId: j } = this.opts;
      if (typeof p == "object")
        b = p[j];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof p != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let A = this._cache.get(p);
      if (A !== void 0)
        return A;
      $ = (0, c.normalizeId)(b || $);
      const F = c.getSchemaRefs.call(this, p, $);
      return A = new o.SchemaEnv({ schema: p, schemaId: j, meta: S, baseId: $, localRefs: F }), this._cache.set(A.schema, A), f && !$.startsWith("#") && ($ && this._checkUnique($), this.refs[$] = A), i && this.validateSchema(p, !0), A;
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
      const S = this.opts;
      this.opts = this._metaOpts;
      try {
        o.compileSchema.call(this, p);
      } finally {
        this.opts = S;
      }
    }
  }
  O.ValidationError = n.default, O.MissingRefError = s.default, e.default = O;
  function T(P, p, S, $ = "error") {
    for (const i in P) {
      const f = i;
      f in p && this.logger[$](`${S}: option ${i}. ${P[f]}`);
    }
  }
  function K(P) {
    return P = (0, c.normalizeId)(P), this.schemas[P] || this.refs[P];
  }
  function J() {
    const P = this.opts.schemas;
    if (P)
      if (Array.isArray(P))
        this.addSchema(P);
      else
        for (const p in P)
          this.addSchema(P[p], p);
  }
  function ie() {
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
      const S = P[p];
      S.keyword || (S.keyword = p), this.addKeyword(S);
    }
  }
  function pe() {
    const P = { ...this.opts };
    for (const p of v)
      delete P[p];
    return P;
  }
  const q = { log() {
  }, warn() {
  }, error() {
  } };
  function X(P) {
    if (P === !1)
      return q;
    if (P === void 0)
      return console;
    if (P.log && P.warn && P.error)
      return P;
    throw new Error("logger must implement log, warn and error methods");
  }
  const W = /^[a-z_$][a-z0-9_$:-]*$/i;
  function H(P, p) {
    const { RULES: S } = this;
    if ((0, u.eachItem)(P, ($) => {
      if (S.keywords[$])
        throw new Error(`Keyword ${$} is already defined`);
      if (!W.test($))
        throw new Error(`Keyword ${$} has invalid name`);
    }), !!p && p.$data && !("code" in p || "validate" in p))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function ce(P, p, S) {
    var $;
    const i = p == null ? void 0 : p.post;
    if (S && i)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: f } = this;
    let b = i ? f.post : f.rules.find(({ type: A }) => A === S);
    if (b || (b = { type: S, rules: [] }, f.rules.push(b)), f.keywords[P] = !0, !p)
      return;
    const j = {
      keyword: P,
      definition: {
        ...p,
        type: (0, d.getJSONTypes)(p.type),
        schemaType: (0, d.getJSONTypes)(p.schemaType)
      }
    };
    p.before ? ve.call(this, b, j, p.before) : b.rules.push(j), f.all[P] = j, ($ = p.implements) === null || $ === void 0 || $.forEach((A) => this.addKeyword(A));
  }
  function ve(P, p, S) {
    const $ = P.rules.findIndex((i) => i.keyword === S);
    $ >= 0 ? P.rules.splice($, 0, p) : (P.rules.push(p), this.logger.warn(`rule ${S} is not defined`));
  }
  function M(P) {
    let { metaSchema: p } = P;
    p !== void 0 && (P.$data && this.opts.$data && (p = z(p)), P.validateSchema = this.compile(p, !0));
  }
  const C = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function z(P) {
    return { anyOf: [P, C] };
  }
})(Fl);
var bo = {}, So = {}, Po = {};
Object.defineProperty(Po, "__esModule", { value: !0 });
const Tg = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
Po.default = Tg;
var ar = {};
Object.defineProperty(ar, "__esModule", { value: !0 });
ar.callRef = ar.getValidate = void 0;
const jg = is(), rc = oe, Ke = ne, lr = mt, nc = Ge, _n = L, Ag = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: l, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const u = nc.resolveRef.call(c, d, s, r);
    if (u === void 0)
      throw new jg.default(n.opts.uriResolver, s, r);
    if (u instanceof nc.SchemaEnv)
      return w(u);
    return y(u);
    function h() {
      if (a === d)
        return Ln(e, o, a, a.$async);
      const v = t.scopeValue("root", { ref: d });
      return Ln(e, (0, Ke._)`${v}.validate`, d, d.$async);
    }
    function w(v) {
      const _ = gu(e, v);
      Ln(e, _, v, v.$async);
    }
    function y(v) {
      const _ = t.scopeValue("schema", l.code.source === !0 ? { ref: v, code: (0, Ke.stringify)(v) } : { ref: v }), g = t.name("valid"), m = e.subschema({
        schema: v,
        dataTypes: [],
        schemaPath: Ke.nil,
        topSchemaRef: _,
        errSchemaPath: r
      }, g);
      e.mergeEvaluated(m), e.ok(g);
    }
  }
};
function gu(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, Ke._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
ar.getValidate = gu;
function Ln(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: l, opts: c } = a, d = c.passContext ? lr.default.this : Ke.nil;
  n ? u() : h();
  function u() {
    if (!l.$async)
      throw new Error("async schema referenced by sync schema");
    const v = s.let("valid");
    s.try(() => {
      s.code((0, Ke._)`await ${(0, rc.callValidateCode)(e, t, d)}`), y(t), o || s.assign(v, !0);
    }, (_) => {
      s.if((0, Ke._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), w(_), o || s.assign(v, !1);
    }), e.ok(v);
  }
  function h() {
    e.result((0, rc.callValidateCode)(e, t, d), () => y(t), () => w(t));
  }
  function w(v) {
    const _ = (0, Ke._)`${v}.errors`;
    s.assign(lr.default.vErrors, (0, Ke._)`${lr.default.vErrors} === null ? ${_} : ${lr.default.vErrors}.concat(${_})`), s.assign(lr.default.errors, (0, Ke._)`${lr.default.vErrors}.length`);
  }
  function y(v) {
    var _;
    if (!a.opts.unevaluated)
      return;
    const g = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (a.props !== !0)
      if (g && !g.dynamicProps)
        g.props !== void 0 && (a.props = _n.mergeEvaluated.props(s, g.props, a.props));
      else {
        const m = s.var("props", (0, Ke._)`${v}.evaluated.props`);
        a.props = _n.mergeEvaluated.props(s, m, a.props, Ke.Name);
      }
    if (a.items !== !0)
      if (g && !g.dynamicItems)
        g.items !== void 0 && (a.items = _n.mergeEvaluated.items(s, g.items, a.items));
      else {
        const m = s.var("items", (0, Ke._)`${v}.evaluated.items`);
        a.items = _n.mergeEvaluated.items(s, m, a.items, Ke.Name);
      }
  }
}
ar.callRef = Ln;
ar.default = Ag;
Object.defineProperty(So, "__esModule", { value: !0 });
const kg = Po, Cg = ar, Dg = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  kg.default,
  Cg.default
];
So.default = Dg;
var No = {}, Ro = {};
Object.defineProperty(Ro, "__esModule", { value: !0 });
const Jn = ne, Tt = Jn.operators, Wn = {
  maximum: { okStr: "<=", ok: Tt.LTE, fail: Tt.GT },
  minimum: { okStr: ">=", ok: Tt.GTE, fail: Tt.LT },
  exclusiveMaximum: { okStr: "<", ok: Tt.LT, fail: Tt.GTE },
  exclusiveMinimum: { okStr: ">", ok: Tt.GT, fail: Tt.LTE }
}, Mg = {
  message: ({ keyword: e, schemaCode: t }) => (0, Jn.str)`must be ${Wn[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, Jn._)`{comparison: ${Wn[e].okStr}, limit: ${t}}`
}, Vg = {
  keyword: Object.keys(Wn),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Mg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, Jn._)`${r} ${Wn[t].fail} ${n} || isNaN(${r})`);
  }
};
Ro.default = Vg;
var Oo = {};
Object.defineProperty(Oo, "__esModule", { value: !0 });
const Wr = ne, Lg = {
  message: ({ schemaCode: e }) => (0, Wr.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, Wr._)`{multipleOf: ${e}}`
}, Fg = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Lg,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), l = a ? (0, Wr._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, Wr._)`${o} !== parseInt(${o})`;
    e.fail$data((0, Wr._)`(${n} === 0 || (${o} = ${r}/${n}, ${l}))`);
  }
};
Oo.default = Fg;
var Io = {}, To = {};
Object.defineProperty(To, "__esModule", { value: !0 });
function _u(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
To.default = _u;
_u.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(Io, "__esModule", { value: !0 });
const Yt = ne, zg = L, Ug = To, qg = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, Yt.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, Yt._)`{limit: ${e}}`
}, Kg = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: qg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? Yt.operators.GT : Yt.operators.LT, o = s.opts.unicode === !1 ? (0, Yt._)`${r}.length` : (0, Yt._)`${(0, zg.useFunc)(e.gen, Ug.default)}(${r})`;
    e.fail$data((0, Yt._)`${o} ${a} ${n}`);
  }
};
Io.default = Kg;
var jo = {};
Object.defineProperty(jo, "__esModule", { value: !0 });
const Gg = oe, Hg = L, $r = ne, Bg = {
  message: ({ schemaCode: e }) => (0, $r.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, $r._)`{pattern: ${e}}`
}, Xg = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Bg,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, l = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, $r._)`new RegExp` : (0, Hg.useFunc)(t, c), u = t.let("valid");
      t.try(() => t.assign(u, (0, $r._)`${d}(${a}, ${l}).test(${r})`), () => t.assign(u, !1)), e.fail$data((0, $r._)`!${u}`);
    } else {
      const c = (0, Gg.usePattern)(e, s);
      e.fail$data((0, $r._)`!${c}.test(${r})`);
    }
  }
};
jo.default = Xg;
var Ao = {};
Object.defineProperty(Ao, "__esModule", { value: !0 });
const Yr = ne, Jg = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, Yr.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, Yr._)`{limit: ${e}}`
}, Wg = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Jg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? Yr.operators.GT : Yr.operators.LT;
    e.fail$data((0, Yr._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
Ao.default = Wg;
var ko = {};
Object.defineProperty(ko, "__esModule", { value: !0 });
const zr = oe, Qr = ne, Yg = L, Qg = {
  message: ({ params: { missingProperty: e } }) => (0, Qr.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, Qr._)`{missingProperty: ${e}}`
}, Zg = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Qg,
  code(e) {
    const { gen: t, schema: r, schemaCode: n, data: s, $data: a, it: o } = e, { opts: l } = o;
    if (!a && r.length === 0)
      return;
    const c = r.length >= l.loopRequired;
    if (o.allErrors ? d() : u(), l.strictRequired) {
      const y = e.parentSchema.properties, { definedProperties: v } = e.it;
      for (const _ of r)
        if ((y == null ? void 0 : y[_]) === void 0 && !v.has(_)) {
          const g = o.schemaEnv.baseId + o.errSchemaPath, m = `required property "${_}" is not defined at "${g}" (strictRequired)`;
          (0, Yg.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(Qr.nil, h);
      else
        for (const y of r)
          (0, zr.checkReportMissingProp)(e, y);
    }
    function u() {
      const y = t.let("missing");
      if (c || a) {
        const v = t.let("valid", !0);
        e.block$data(v, () => w(y, v)), e.ok(v);
      } else
        t.if((0, zr.checkMissingProp)(e, r, y)), (0, zr.reportMissingProp)(e, y), t.else();
    }
    function h() {
      t.forOf("prop", n, (y) => {
        e.setParams({ missingProperty: y }), t.if((0, zr.noPropertyInData)(t, s, y, l.ownProperties), () => e.error());
      });
    }
    function w(y, v) {
      e.setParams({ missingProperty: y }), t.forOf(y, n, () => {
        t.assign(v, (0, zr.propertyInData)(t, s, y, l.ownProperties)), t.if((0, Qr.not)(v), () => {
          e.error(), t.break();
        });
      }, Qr.nil);
    }
  }
};
ko.default = Zg;
var Co = {};
Object.defineProperty(Co, "__esModule", { value: !0 });
const Zr = ne, xg = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, Zr.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, Zr._)`{limit: ${e}}`
}, e_ = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: xg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? Zr.operators.GT : Zr.operators.LT;
    e.fail$data((0, Zr._)`${r}.length ${s} ${n}`);
  }
};
Co.default = e_;
var Do = {}, an = {};
Object.defineProperty(an, "__esModule", { value: !0 });
const vu = Zn;
vu.code = 'require("ajv/dist/runtime/equal").default';
an.default = vu;
Object.defineProperty(Do, "__esModule", { value: !0 });
const Os = Ee, Re = ne, t_ = L, r_ = an, n_ = {
  message: ({ params: { i: e, j: t } }) => (0, Re.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, Re._)`{i: ${e}, j: ${t}}`
}, s_ = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: n_,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, parentSchema: a, schemaCode: o, it: l } = e;
    if (!n && !s)
      return;
    const c = t.let("valid"), d = a.items ? (0, Os.getSchemaTypes)(a.items) : [];
    e.block$data(c, u, (0, Re._)`${o} === false`), e.ok(c);
    function u() {
      const v = t.let("i", (0, Re._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: v, j: _ }), t.assign(c, !0), t.if((0, Re._)`${v} > 1`, () => (h() ? w : y)(v, _));
    }
    function h() {
      return d.length > 0 && !d.some((v) => v === "object" || v === "array");
    }
    function w(v, _) {
      const g = t.name("item"), m = (0, Os.checkDataTypes)(d, g, l.opts.strictNumbers, Os.DataType.Wrong), E = t.const("indices", (0, Re._)`{}`);
      t.for((0, Re._)`;${v}--;`, () => {
        t.let(g, (0, Re._)`${r}[${v}]`), t.if(m, (0, Re._)`continue`), d.length > 1 && t.if((0, Re._)`typeof ${g} == "string"`, (0, Re._)`${g} += "_"`), t.if((0, Re._)`typeof ${E}[${g}] == "number"`, () => {
          t.assign(_, (0, Re._)`${E}[${g}]`), e.error(), t.assign(c, !1).break();
        }).code((0, Re._)`${E}[${g}] = ${v}`);
      });
    }
    function y(v, _) {
      const g = (0, t_.useFunc)(t, r_.default), m = t.name("outer");
      t.label(m).for((0, Re._)`;${v}--;`, () => t.for((0, Re._)`${_} = ${v}; ${_}--;`, () => t.if((0, Re._)`${g}(${r}[${v}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Do.default = s_;
var Mo = {};
Object.defineProperty(Mo, "__esModule", { value: !0 });
const ea = ne, a_ = L, o_ = an, i_ = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, ea._)`{allowedValue: ${e}}`
}, c_ = {
  keyword: "const",
  $data: !0,
  error: i_,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, ea._)`!${(0, a_.useFunc)(t, o_.default)}(${r}, ${s})`) : e.fail((0, ea._)`${a} !== ${r}`);
  }
};
Mo.default = c_;
var Vo = {};
Object.defineProperty(Vo, "__esModule", { value: !0 });
const Kr = ne, l_ = L, u_ = an, d_ = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Kr._)`{allowedValues: ${e}}`
}, f_ = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: d_,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const l = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, l_.useFunc)(t, u_.default));
    let u;
    if (l || n)
      u = t.let("valid"), e.block$data(u, h);
    else {
      if (!Array.isArray(s))
        throw new Error("ajv implementation error");
      const y = t.const("vSchema", a);
      u = (0, Kr.or)(...s.map((v, _) => w(y, _)));
    }
    e.pass(u);
    function h() {
      t.assign(u, !1), t.forOf("v", a, (y) => t.if((0, Kr._)`${d()}(${r}, ${y})`, () => t.assign(u, !0).break()));
    }
    function w(y, v) {
      const _ = s[v];
      return typeof _ == "object" && _ !== null ? (0, Kr._)`${d()}(${r}, ${y}[${v}])` : (0, Kr._)`${r} === ${_}`;
    }
  }
};
Vo.default = f_;
Object.defineProperty(No, "__esModule", { value: !0 });
const h_ = Ro, m_ = Oo, p_ = Io, $_ = jo, y_ = Ao, g_ = ko, __ = Co, v_ = Do, w_ = Mo, E_ = Vo, b_ = [
  // number
  h_.default,
  m_.default,
  // string
  p_.default,
  $_.default,
  // object
  y_.default,
  g_.default,
  // array
  __.default,
  v_.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  w_.default,
  E_.default
];
No.default = b_;
var Lo = {}, jr = {};
Object.defineProperty(jr, "__esModule", { value: !0 });
jr.validateAdditionalItems = void 0;
const Qt = ne, ta = L, S_ = {
  message: ({ params: { len: e } }) => (0, Qt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Qt._)`{limit: ${e}}`
}, P_ = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: S_,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, ta.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    wu(e, n);
  }
};
function wu(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const l = r.const("len", (0, Qt._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, Qt._)`${l} <= ${t.length}`);
  else if (typeof n == "object" && !(0, ta.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, Qt._)`${l} <= ${t.length}`);
    r.if((0, Qt.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, l, (u) => {
      e.subschema({ keyword: a, dataProp: u, dataPropType: ta.Type.Num }, d), o.allErrors || r.if((0, Qt.not)(d), () => r.break());
    });
  }
}
jr.validateAdditionalItems = wu;
jr.default = P_;
var Fo = {}, Ar = {};
Object.defineProperty(Ar, "__esModule", { value: !0 });
Ar.validateTuple = void 0;
const sc = ne, Fn = L, N_ = oe, R_ = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return Eu(e, "additionalItems", t);
    r.items = !0, !(0, Fn.alwaysValidSchema)(r, t) && e.ok((0, N_.validateArray)(e));
  }
};
function Eu(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: l } = e;
  u(s), l.opts.unevaluated && r.length && l.items !== !0 && (l.items = Fn.mergeEvaluated.items(n, r.length, l.items));
  const c = n.name("valid"), d = n.const("len", (0, sc._)`${a}.length`);
  r.forEach((h, w) => {
    (0, Fn.alwaysValidSchema)(l, h) || (n.if((0, sc._)`${d} > ${w}`, () => e.subschema({
      keyword: o,
      schemaProp: w,
      dataProp: w
    }, c)), e.ok(c));
  });
  function u(h) {
    const { opts: w, errSchemaPath: y } = l, v = r.length, _ = v === h.minItems && (v === h.maxItems || h[t] === !1);
    if (w.strictTuples && !_) {
      const g = `"${o}" is ${v}-tuple, but minItems or maxItems/${t} are not specified or different at path "${y}"`;
      (0, Fn.checkStrictMode)(l, g, w.strictTuples);
    }
  }
}
Ar.validateTuple = Eu;
Ar.default = R_;
Object.defineProperty(Fo, "__esModule", { value: !0 });
const O_ = Ar, I_ = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, O_.validateTuple)(e, "items")
};
Fo.default = I_;
var zo = {};
Object.defineProperty(zo, "__esModule", { value: !0 });
const ac = ne, T_ = L, j_ = oe, A_ = jr, k_ = {
  message: ({ params: { len: e } }) => (0, ac.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, ac._)`{limit: ${e}}`
}, C_ = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: k_,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, T_.alwaysValidSchema)(n, t) && (s ? (0, A_.validateAdditionalItems)(e, s) : e.ok((0, j_.validateArray)(e)));
  }
};
zo.default = C_;
var Uo = {};
Object.defineProperty(Uo, "__esModule", { value: !0 });
const Je = ne, vn = L, D_ = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Je.str)`must contain at least ${e} valid item(s)` : (0, Je.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Je._)`{minContains: ${e}}` : (0, Je._)`{minContains: ${e}, maxContains: ${t}}`
}, M_ = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: D_,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, l;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, l = d) : o = 1;
    const u = t.const("len", (0, Je._)`${s}.length`);
    if (e.setParams({ min: o, max: l }), l === void 0 && o === 0) {
      (0, vn.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (l !== void 0 && o > l) {
      (0, vn.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, vn.alwaysValidSchema)(a, r)) {
      let _ = (0, Je._)`${u} >= ${o}`;
      l !== void 0 && (_ = (0, Je._)`${_} && ${u} <= ${l}`), e.pass(_);
      return;
    }
    a.items = !0;
    const h = t.name("valid");
    l === void 0 && o === 1 ? y(h, () => t.if(h, () => t.break())) : o === 0 ? (t.let(h, !0), l !== void 0 && t.if((0, Je._)`${s}.length > 0`, w)) : (t.let(h, !1), w()), e.result(h, () => e.reset());
    function w() {
      const _ = t.name("_valid"), g = t.let("count", 0);
      y(_, () => t.if(_, () => v(g)));
    }
    function y(_, g) {
      t.forRange("i", 0, u, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: vn.Type.Num,
          compositeRule: !0
        }, _), g();
      });
    }
    function v(_) {
      t.code((0, Je._)`${_}++`), l === void 0 ? t.if((0, Je._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, Je._)`${_} > ${l}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, Je._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
Uo.default = M_;
var bu = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
  const t = ne, r = L, n = oe;
  e.error = {
    message: ({ params: { property: c, depsCount: d, deps: u } }) => {
      const h = d === 1 ? "property" : "properties";
      return (0, t.str)`must have ${h} ${u} when property ${c} is present`;
    },
    params: ({ params: { property: c, depsCount: d, deps: u, missingProperty: h } }) => (0, t._)`{property: ${c},
    missingProperty: ${h},
    depsCount: ${d},
    deps: ${u}}`
    // TODO change to reference
  };
  const s = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: e.error,
    code(c) {
      const [d, u] = a(c);
      o(c, d), l(c, u);
    }
  };
  function a({ schema: c }) {
    const d = {}, u = {};
    for (const h in c) {
      if (h === "__proto__")
        continue;
      const w = Array.isArray(c[h]) ? d : u;
      w[h] = c[h];
    }
    return [d, u];
  }
  function o(c, d = c.schema) {
    const { gen: u, data: h, it: w } = c;
    if (Object.keys(d).length === 0)
      return;
    const y = u.let("missing");
    for (const v in d) {
      const _ = d[v];
      if (_.length === 0)
        continue;
      const g = (0, n.propertyInData)(u, h, v, w.opts.ownProperties);
      c.setParams({
        property: v,
        depsCount: _.length,
        deps: _.join(", ")
      }), w.allErrors ? u.if(g, () => {
        for (const m of _)
          (0, n.checkReportMissingProp)(c, m);
      }) : (u.if((0, t._)`${g} && (${(0, n.checkMissingProp)(c, _, y)})`), (0, n.reportMissingProp)(c, y), u.else());
    }
  }
  e.validatePropertyDeps = o;
  function l(c, d = c.schema) {
    const { gen: u, data: h, keyword: w, it: y } = c, v = u.name("valid");
    for (const _ in d)
      (0, r.alwaysValidSchema)(y, d[_]) || (u.if(
        (0, n.propertyInData)(u, h, _, y.opts.ownProperties),
        () => {
          const g = c.subschema({ keyword: w, schemaProp: _ }, v);
          c.mergeValidEvaluated(g, v);
        },
        () => u.var(v, !0)
        // TODO var
      ), c.ok(v));
  }
  e.validateSchemaDeps = l, e.default = s;
})(bu);
var qo = {};
Object.defineProperty(qo, "__esModule", { value: !0 });
const Su = ne, V_ = L, L_ = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, Su._)`{propertyName: ${e.propertyName}}`
}, F_ = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: L_,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, V_.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, Su.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
qo.default = F_;
var us = {};
Object.defineProperty(us, "__esModule", { value: !0 });
const wn = oe, tt = ne, z_ = mt, En = L, U_ = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, tt._)`{additionalProperty: ${e.additionalProperty}}`
}, q_ = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: U_,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: l, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, En.alwaysValidSchema)(o, r))
      return;
    const d = (0, wn.allSchemaProperties)(n.properties), u = (0, wn.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, tt._)`${a} === ${z_.default.errors}`);
    function h() {
      t.forIn("key", s, (g) => {
        !d.length && !u.length ? v(g) : t.if(w(g), () => v(g));
      });
    }
    function w(g) {
      let m;
      if (d.length > 8) {
        const E = (0, En.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, wn.isOwnProperty)(t, E, g);
      } else d.length ? m = (0, tt.or)(...d.map((E) => (0, tt._)`${g} === ${E}`)) : m = tt.nil;
      return u.length && (m = (0, tt.or)(m, ...u.map((E) => (0, tt._)`${(0, wn.usePattern)(e, E)}.test(${g})`))), (0, tt.not)(m);
    }
    function y(g) {
      t.code((0, tt._)`delete ${s}[${g}]`);
    }
    function v(g) {
      if (c.removeAdditional === "all" || c.removeAdditional && r === !1) {
        y(g);
        return;
      }
      if (r === !1) {
        e.setParams({ additionalProperty: g }), e.error(), l || t.break();
        return;
      }
      if (typeof r == "object" && !(0, En.alwaysValidSchema)(o, r)) {
        const m = t.name("valid");
        c.removeAdditional === "failing" ? (_(g, m, !1), t.if((0, tt.not)(m), () => {
          e.reset(), y(g);
        })) : (_(g, m), l || t.if((0, tt.not)(m), () => t.break()));
      }
    }
    function _(g, m, E) {
      const R = {
        keyword: "additionalProperties",
        dataProp: g,
        dataPropType: En.Type.Str
      };
      E === !1 && Object.assign(R, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(R, m);
    }
  }
};
us.default = q_;
var Ko = {};
Object.defineProperty(Ko, "__esModule", { value: !0 });
const K_ = st, oc = oe, Is = L, ic = us, G_ = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && ic.default.code(new K_.KeywordCxt(a, ic.default, "additionalProperties"));
    const o = (0, oc.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = Is.mergeEvaluated.props(t, (0, Is.toHash)(o), a.props));
    const l = o.filter((h) => !(0, Is.alwaysValidSchema)(a, r[h]));
    if (l.length === 0)
      return;
    const c = t.name("valid");
    for (const h of l)
      d(h) ? u(h) : (t.if((0, oc.propertyInData)(t, s, h, a.opts.ownProperties)), u(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
    function d(h) {
      return a.opts.useDefaults && !a.compositeRule && r[h].default !== void 0;
    }
    function u(h) {
      e.subschema({
        keyword: "properties",
        schemaProp: h,
        dataProp: h
      }, c);
    }
  }
};
Ko.default = G_;
var Go = {};
Object.defineProperty(Go, "__esModule", { value: !0 });
const cc = oe, bn = ne, lc = L, uc = L, H_ = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, l = (0, cc.allSchemaProperties)(r), c = l.filter((_) => (0, lc.alwaysValidSchema)(a, r[_]));
    if (l.length === 0 || c.length === l.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, u = t.name("valid");
    a.props !== !0 && !(a.props instanceof bn.Name) && (a.props = (0, uc.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    w();
    function w() {
      for (const _ of l)
        d && y(_), a.allErrors ? v(_) : (t.var(u, !0), v(_), t.if(u));
    }
    function y(_) {
      for (const g in d)
        new RegExp(_).test(g) && (0, lc.checkStrictMode)(a, `property ${g} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function v(_) {
      t.forIn("key", n, (g) => {
        t.if((0, bn._)`${(0, cc.usePattern)(e, _)}.test(${g})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: g,
            dataPropType: uc.Type.Str
          }, u), a.opts.unevaluated && h !== !0 ? t.assign((0, bn._)`${h}[${g}]`, !0) : !m && !a.allErrors && t.if((0, bn.not)(u), () => t.break());
        });
      });
    }
  }
};
Go.default = H_;
var Ho = {};
Object.defineProperty(Ho, "__esModule", { value: !0 });
const B_ = L, X_ = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, B_.alwaysValidSchema)(n, r)) {
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
Ho.default = X_;
var Bo = {};
Object.defineProperty(Bo, "__esModule", { value: !0 });
const J_ = oe, W_ = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: J_.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Bo.default = W_;
var Xo = {};
Object.defineProperty(Xo, "__esModule", { value: !0 });
const zn = ne, Y_ = L, Q_ = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, zn._)`{passingSchemas: ${e.passing}}`
}, Z_ = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Q_,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, it: s } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (s.opts.discriminator && n.discriminator)
      return;
    const a = r, o = t.let("valid", !1), l = t.let("passing", null), c = t.name("_valid");
    e.setParams({ passing: l }), t.block(d), e.result(o, () => e.reset(), () => e.error(!0));
    function d() {
      a.forEach((u, h) => {
        let w;
        (0, Y_.alwaysValidSchema)(s, u) ? t.var(c, !0) : w = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, zn._)`${c} && ${o}`).assign(o, !1).assign(l, (0, zn._)`[${l}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(l, h), w && e.mergeEvaluated(w, zn.Name);
        });
      });
    }
  }
};
Xo.default = Z_;
var Jo = {};
Object.defineProperty(Jo, "__esModule", { value: !0 });
const x_ = L, ev = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, x_.alwaysValidSchema)(n, a))
        return;
      const l = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(l);
    });
  }
};
Jo.default = ev;
var Wo = {};
Object.defineProperty(Wo, "__esModule", { value: !0 });
const Yn = ne, Pu = L, tv = {
  message: ({ params: e }) => (0, Yn.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, Yn._)`{failingKeyword: ${e.ifClause}}`
}, rv = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: tv,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Pu.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = dc(n, "then"), a = dc(n, "else");
    if (!s && !a)
      return;
    const o = t.let("valid", !0), l = t.name("_valid");
    if (c(), e.reset(), s && a) {
      const u = t.let("ifClause");
      e.setParams({ ifClause: u }), t.if(l, d("then", u), d("else", u));
    } else s ? t.if(l, d("then")) : t.if((0, Yn.not)(l), d("else"));
    e.pass(o, () => e.error(!0));
    function c() {
      const u = e.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, l);
      e.mergeEvaluated(u);
    }
    function d(u, h) {
      return () => {
        const w = e.subschema({ keyword: u }, l);
        t.assign(o, l), e.mergeValidEvaluated(w, o), h ? t.assign(h, (0, Yn._)`${u}`) : e.setParams({ ifClause: u });
      };
    }
  }
};
function dc(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Pu.alwaysValidSchema)(e, r);
}
Wo.default = rv;
var Yo = {};
Object.defineProperty(Yo, "__esModule", { value: !0 });
const nv = L, sv = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, nv.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
Yo.default = sv;
Object.defineProperty(Lo, "__esModule", { value: !0 });
const av = jr, ov = Fo, iv = Ar, cv = zo, lv = Uo, uv = bu, dv = qo, fv = us, hv = Ko, mv = Go, pv = Ho, $v = Bo, yv = Xo, gv = Jo, _v = Wo, vv = Yo;
function wv(e = !1) {
  const t = [
    // any
    pv.default,
    $v.default,
    yv.default,
    gv.default,
    _v.default,
    vv.default,
    // object
    dv.default,
    fv.default,
    uv.default,
    hv.default,
    mv.default
  ];
  return e ? t.push(ov.default, cv.default) : t.push(av.default, iv.default), t.push(lv.default), t;
}
Lo.default = wv;
var Qo = {}, Zo = {};
Object.defineProperty(Zo, "__esModule", { value: !0 });
const _e = ne, Ev = {
  message: ({ schemaCode: e }) => (0, _e.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, _e._)`{format: ${e}}`
}, bv = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: Ev,
  code(e, t) {
    const { gen: r, data: n, $data: s, schema: a, schemaCode: o, it: l } = e, { opts: c, errSchemaPath: d, schemaEnv: u, self: h } = l;
    if (!c.validateFormats)
      return;
    s ? w() : y();
    function w() {
      const v = r.scopeValue("formats", {
        ref: h.formats,
        code: c.code.formats
      }), _ = r.const("fDef", (0, _e._)`${v}[${o}]`), g = r.let("fType"), m = r.let("format");
      r.if((0, _e._)`typeof ${_} == "object" && !(${_} instanceof RegExp)`, () => r.assign(g, (0, _e._)`${_}.type || "string"`).assign(m, (0, _e._)`${_}.validate`), () => r.assign(g, (0, _e._)`"string"`).assign(m, _)), e.fail$data((0, _e.or)(E(), R()));
      function E() {
        return c.strictSchema === !1 ? _e.nil : (0, _e._)`${o} && !${m}`;
      }
      function R() {
        const O = u.$async ? (0, _e._)`(${_}.async ? await ${m}(${n}) : ${m}(${n}))` : (0, _e._)`${m}(${n})`, T = (0, _e._)`(typeof ${m} == "function" ? ${O} : ${m}.test(${n}))`;
        return (0, _e._)`${m} && ${m} !== true && ${g} === ${t} && !${T}`;
      }
    }
    function y() {
      const v = h.formats[a];
      if (!v) {
        E();
        return;
      }
      if (v === !0)
        return;
      const [_, g, m] = R(v);
      _ === t && e.pass(O());
      function E() {
        if (c.strictSchema === !1) {
          h.logger.warn(T());
          return;
        }
        throw new Error(T());
        function T() {
          return `unknown format "${a}" ignored in schema at path "${d}"`;
        }
      }
      function R(T) {
        const K = T instanceof RegExp ? (0, _e.regexpCode)(T) : c.code.formats ? (0, _e._)`${c.code.formats}${(0, _e.getProperty)(a)}` : void 0, J = r.scopeValue("formats", { key: a, ref: T, code: K });
        return typeof T == "object" && !(T instanceof RegExp) ? [T.type || "string", T.validate, (0, _e._)`${J}.validate`] : ["string", T, J];
      }
      function O() {
        if (typeof v == "object" && !(v instanceof RegExp) && v.async) {
          if (!u.$async)
            throw new Error("async format in sync schema");
          return (0, _e._)`await ${m}(${n})`;
        }
        return typeof g == "function" ? (0, _e._)`${m}(${n})` : (0, _e._)`${m}.test(${n})`;
      }
    }
  }
};
Zo.default = bv;
Object.defineProperty(Qo, "__esModule", { value: !0 });
const Sv = Zo, Pv = [Sv.default];
Qo.default = Pv;
var Pr = {};
Object.defineProperty(Pr, "__esModule", { value: !0 });
Pr.contentVocabulary = Pr.metadataVocabulary = void 0;
Pr.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
Pr.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(bo, "__esModule", { value: !0 });
const Nv = So, Rv = No, Ov = Lo, Iv = Qo, fc = Pr, Tv = [
  Nv.default,
  Rv.default,
  (0, Ov.default)(),
  Iv.default,
  fc.metadataVocabulary,
  fc.contentVocabulary
];
bo.default = Tv;
var xo = {}, ds = {};
Object.defineProperty(ds, "__esModule", { value: !0 });
ds.DiscrError = void 0;
var hc;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(hc || (ds.DiscrError = hc = {}));
Object.defineProperty(xo, "__esModule", { value: !0 });
const fr = ne, ra = ds, mc = Ge, jv = is(), Av = L, kv = {
  message: ({ params: { discrError: e, tagName: t } }) => e === ra.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, fr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, Cv = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: kv,
  code(e) {
    const { gen: t, data: r, schema: n, parentSchema: s, it: a } = e, { oneOf: o } = s;
    if (!a.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const l = n.propertyName;
    if (typeof l != "string")
      throw new Error("discriminator: requires propertyName");
    if (n.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!o)
      throw new Error("discriminator: requires oneOf keyword");
    const c = t.let("valid", !1), d = t.const("tag", (0, fr._)`${r}${(0, fr.getProperty)(l)}`);
    t.if((0, fr._)`typeof ${d} == "string"`, () => u(), () => e.error(!1, { discrError: ra.DiscrError.Tag, tag: d, tagName: l })), e.ok(c);
    function u() {
      const y = w();
      t.if(!1);
      for (const v in y)
        t.elseIf((0, fr._)`${d} === ${v}`), t.assign(c, h(y[v]));
      t.else(), e.error(!1, { discrError: ra.DiscrError.Mapping, tag: d, tagName: l }), t.endIf();
    }
    function h(y) {
      const v = t.name("valid"), _ = e.subschema({ keyword: "oneOf", schemaProp: y }, v);
      return e.mergeEvaluated(_, fr.Name), v;
    }
    function w() {
      var y;
      const v = {}, _ = m(s);
      let g = !0;
      for (let O = 0; O < o.length; O++) {
        let T = o[O];
        if (T != null && T.$ref && !(0, Av.schemaHasRulesButRef)(T, a.self.RULES)) {
          const J = T.$ref;
          if (T = mc.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, J), T instanceof mc.SchemaEnv && (T = T.schema), T === void 0)
            throw new jv.default(a.opts.uriResolver, a.baseId, J);
        }
        const K = (y = T == null ? void 0 : T.properties) === null || y === void 0 ? void 0 : y[l];
        if (typeof K != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${l}"`);
        g = g && (_ || m(T)), E(K, O);
      }
      if (!g)
        throw new Error(`discriminator: "${l}" must be required`);
      return v;
      function m({ required: O }) {
        return Array.isArray(O) && O.includes(l);
      }
      function E(O, T) {
        if (O.const)
          R(O.const, T);
        else if (O.enum)
          for (const K of O.enum)
            R(K, T);
        else
          throw new Error(`discriminator: "properties/${l}" must have "const" or "enum"`);
      }
      function R(O, T) {
        if (typeof O != "string" || O in v)
          throw new Error(`discriminator: "${l}" values must be unique strings`);
        v[O] = T;
      }
    }
  }
};
xo.default = Cv;
const Dv = "http://json-schema.org/draft-07/schema#", Mv = "http://json-schema.org/draft-07/schema#", Vv = "Core schema meta-schema", Lv = {
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
}, Fv = [
  "object",
  "boolean"
], zv = {
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
}, Uv = {
  $schema: Dv,
  $id: Mv,
  title: Vv,
  definitions: Lv,
  type: Fv,
  properties: zv,
  default: !0
};
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv = void 0;
  const r = Fl, n = bo, s = xo, a = Uv, o = ["/properties"], l = "http://json-schema.org/draft-07/schema";
  class c extends r.default {
    _addVocabularies() {
      super._addVocabularies(), n.default.forEach((v) => this.addVocabulary(v)), this.opts.discriminator && this.addKeyword(s.default);
    }
    _addDefaultMetaSchema() {
      if (super._addDefaultMetaSchema(), !this.opts.meta)
        return;
      const v = this.opts.$data ? this.$dataMetaSchema(a, o) : a;
      this.addMetaSchema(v, l, !1), this.refs["http://json-schema.org/schema"] = l;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(l) ? l : void 0);
    }
  }
  t.Ajv = c, e.exports = t = c, e.exports.Ajv = c, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = c;
  var d = st;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return d.KeywordCxt;
  } });
  var u = ne;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return u._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return u.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return u.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return u.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return u.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return u.CodeGen;
  } });
  var h = vo();
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return h.default;
  } });
  var w = is();
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return w.default;
  } });
})(Ws, Ws.exports);
var qv = Ws.exports;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatLimitDefinition = void 0;
  const t = qv, r = ne, n = r.operators, s = {
    formatMaximum: { okStr: "<=", ok: n.LTE, fail: n.GT },
    formatMinimum: { okStr: ">=", ok: n.GTE, fail: n.LT },
    formatExclusiveMaximum: { okStr: "<", ok: n.LT, fail: n.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: n.GT, fail: n.LTE }
  }, a = {
    message: ({ keyword: l, schemaCode: c }) => (0, r.str)`should be ${s[l].okStr} ${c}`,
    params: ({ keyword: l, schemaCode: c }) => (0, r._)`{comparison: ${s[l].okStr}, limit: ${c}}`
  };
  e.formatLimitDefinition = {
    keyword: Object.keys(s),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: a,
    code(l) {
      const { gen: c, data: d, schemaCode: u, keyword: h, it: w } = l, { opts: y, self: v } = w;
      if (!y.validateFormats)
        return;
      const _ = new t.KeywordCxt(w, v.RULES.all.format.definition, "format");
      _.$data ? g() : m();
      function g() {
        const R = c.scopeValue("formats", {
          ref: v.formats,
          code: y.code.formats
        }), O = c.const("fmt", (0, r._)`${R}[${_.schemaCode}]`);
        l.fail$data((0, r.or)((0, r._)`typeof ${O} != "object"`, (0, r._)`${O} instanceof RegExp`, (0, r._)`typeof ${O}.compare != "function"`, E(O)));
      }
      function m() {
        const R = _.schema, O = v.formats[R];
        if (!O || O === !0)
          return;
        if (typeof O != "object" || O instanceof RegExp || typeof O.compare != "function")
          throw new Error(`"${h}": format "${R}" does not define "compare" function`);
        const T = c.scopeValue("formats", {
          key: R,
          ref: O,
          code: y.code.formats ? (0, r._)`${y.code.formats}${(0, r.getProperty)(R)}` : void 0
        });
        l.fail$data(E(T));
      }
      function E(R) {
        return (0, r._)`${R}.compare(${d}, ${u}) ${s[h].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const o = (l) => (l.addKeyword(e.formatLimitDefinition), l);
  e.default = o;
})(Ll);
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 });
  const r = Vl, n = Ll, s = ne, a = new s.Name("fullFormats"), o = new s.Name("fastFormats"), l = (d, u = { keywords: !0 }) => {
    if (Array.isArray(u))
      return c(d, u, r.fullFormats, a), d;
    const [h, w] = u.mode === "fast" ? [r.fastFormats, o] : [r.fullFormats, a], y = u.formats || r.formatNames;
    return c(d, y, h, w), u.keywords && (0, n.default)(d), d;
  };
  l.get = (d, u = "full") => {
    const w = (u === "fast" ? r.fastFormats : r.fullFormats)[d];
    if (!w)
      throw new Error(`Unknown format "${d}"`);
    return w;
  };
  function c(d, u, h, w) {
    var y, v;
    (y = (v = d.opts.code).formats) !== null && y !== void 0 || (v.formats = (0, s._)`require("ajv-formats/dist/formats").${w}`);
    for (const _ of u)
      d.addFormat(_, h[_]);
  }
  e.exports = t = l, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = l;
})(Js, Js.exports);
var Kv = Js.exports;
const Gv = /* @__PURE__ */ Xc(Kv), Hv = (e, t, r, n) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  const s = Object.getOwnPropertyDescriptor(e, r), a = Object.getOwnPropertyDescriptor(t, r);
  !Bv(s, a) && n || Object.defineProperty(e, r, a);
}, Bv = function(e, t) {
  return e === void 0 || e.configurable || e.writable === t.writable && e.enumerable === t.enumerable && e.configurable === t.configurable && (e.writable || e.value === t.value);
}, Xv = (e, t) => {
  const r = Object.getPrototypeOf(t);
  r !== Object.getPrototypeOf(e) && Object.setPrototypeOf(e, r);
}, Jv = (e, t) => `/* Wrapped ${e}*/
${t}`, Wv = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), Yv = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"), Qv = (e, t, r) => {
  const n = r === "" ? "" : `with ${r.trim()}() `, s = Jv.bind(null, n, t.toString());
  Object.defineProperty(s, "name", Yv);
  const { writable: a, enumerable: o, configurable: l } = Wv;
  Object.defineProperty(e, "toString", { value: s, writable: a, enumerable: o, configurable: l });
};
function Zv(e, t, { ignoreNonConfigurable: r = !1 } = {}) {
  const { name: n } = e;
  for (const s of Reflect.ownKeys(t))
    Hv(e, t, s, r);
  return Xv(e, t), Qv(e, t, n), e;
}
const pc = (e, t = {}) => {
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
  let o, l, c;
  const d = function(...u) {
    const h = this, w = () => {
      o = void 0, l && (clearTimeout(l), l = void 0), a && (c = e.apply(h, u));
    }, y = () => {
      l = void 0, o && (clearTimeout(o), o = void 0), a && (c = e.apply(h, u));
    }, v = s && !o;
    return clearTimeout(o), o = setTimeout(w, r), n > 0 && n !== Number.POSITIVE_INFINITY && !l && (l = setTimeout(y, n)), v && (c = e.apply(h, u)), c;
  };
  return Zv(d, e), d.cancel = () => {
    o && (clearTimeout(o), o = void 0), l && (clearTimeout(l), l = void 0);
  }, d;
};
var na = { exports: {} };
const xv = "2.0.0", Nu = 256, ew = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, tw = 16, rw = Nu - 6, nw = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var on = {
  MAX_LENGTH: Nu,
  MAX_SAFE_COMPONENT_LENGTH: tw,
  MAX_SAFE_BUILD_LENGTH: rw,
  MAX_SAFE_INTEGER: ew,
  RELEASE_TYPES: nw,
  SEMVER_SPEC_VERSION: xv,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const sw = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {
};
var fs = sw;
(function(e, t) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: r,
    MAX_SAFE_BUILD_LENGTH: n,
    MAX_LENGTH: s
  } = on, a = fs;
  t = e.exports = {};
  const o = t.re = [], l = t.safeRe = [], c = t.src = [], d = t.safeSrc = [], u = t.t = {};
  let h = 0;
  const w = "[a-zA-Z0-9-]", y = [
    ["\\s", 1],
    ["\\d", s],
    [w, n]
  ], v = (g) => {
    for (const [m, E] of y)
      g = g.split(`${m}*`).join(`${m}{0,${E}}`).split(`${m}+`).join(`${m}{1,${E}}`);
    return g;
  }, _ = (g, m, E) => {
    const R = v(m), O = h++;
    a(g, O, m), u[g] = O, c[O] = m, d[O] = R, o[O] = new RegExp(m, E ? "g" : void 0), l[O] = new RegExp(R, E ? "g" : void 0);
  };
  _("NUMERICIDENTIFIER", "0|[1-9]\\d*"), _("NUMERICIDENTIFIERLOOSE", "\\d+"), _("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${w}*`), _("MAINVERSION", `(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})\\.(${c[u.NUMERICIDENTIFIER]})`), _("MAINVERSIONLOOSE", `(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})\\.(${c[u.NUMERICIDENTIFIERLOOSE]})`), _("PRERELEASEIDENTIFIER", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIER]})`), _("PRERELEASEIDENTIFIERLOOSE", `(?:${c[u.NONNUMERICIDENTIFIER]}|${c[u.NUMERICIDENTIFIERLOOSE]})`), _("PRERELEASE", `(?:-(${c[u.PRERELEASEIDENTIFIER]}(?:\\.${c[u.PRERELEASEIDENTIFIER]})*))`), _("PRERELEASELOOSE", `(?:-?(${c[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${c[u.PRERELEASEIDENTIFIERLOOSE]})*))`), _("BUILDIDENTIFIER", `${w}+`), _("BUILD", `(?:\\+(${c[u.BUILDIDENTIFIER]}(?:\\.${c[u.BUILDIDENTIFIER]})*))`), _("FULLPLAIN", `v?${c[u.MAINVERSION]}${c[u.PRERELEASE]}?${c[u.BUILD]}?`), _("FULL", `^${c[u.FULLPLAIN]}$`), _("LOOSEPLAIN", `[v=\\s]*${c[u.MAINVERSIONLOOSE]}${c[u.PRERELEASELOOSE]}?${c[u.BUILD]}?`), _("LOOSE", `^${c[u.LOOSEPLAIN]}$`), _("GTLT", "((?:<|>)?=?)"), _("XRANGEIDENTIFIERLOOSE", `${c[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), _("XRANGEIDENTIFIER", `${c[u.NUMERICIDENTIFIER]}|x|X|\\*`), _("XRANGEPLAIN", `[v=\\s]*(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:\\.(${c[u.XRANGEIDENTIFIER]})(?:${c[u.PRERELEASE]})?${c[u.BUILD]}?)?)?`), _("XRANGEPLAINLOOSE", `[v=\\s]*(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${c[u.XRANGEIDENTIFIERLOOSE]})(?:${c[u.PRERELEASELOOSE]})?${c[u.BUILD]}?)?)?`), _("XRANGE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAIN]}$`), _("XRANGELOOSE", `^${c[u.GTLT]}\\s*${c[u.XRANGEPLAINLOOSE]}$`), _("COERCEPLAIN", `(^|[^\\d])(\\d{1,${r}})(?:\\.(\\d{1,${r}}))?(?:\\.(\\d{1,${r}}))?`), _("COERCE", `${c[u.COERCEPLAIN]}(?:$|[^\\d])`), _("COERCEFULL", c[u.COERCEPLAIN] + `(?:${c[u.PRERELEASE]})?(?:${c[u.BUILD]})?(?:$|[^\\d])`), _("COERCERTL", c[u.COERCE], !0), _("COERCERTLFULL", c[u.COERCEFULL], !0), _("LONETILDE", "(?:~>?)"), _("TILDETRIM", `(\\s*)${c[u.LONETILDE]}\\s+`, !0), t.tildeTrimReplace = "$1~", _("TILDE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAIN]}$`), _("TILDELOOSE", `^${c[u.LONETILDE]}${c[u.XRANGEPLAINLOOSE]}$`), _("LONECARET", "(?:\\^)"), _("CARETTRIM", `(\\s*)${c[u.LONECARET]}\\s+`, !0), t.caretTrimReplace = "$1^", _("CARET", `^${c[u.LONECARET]}${c[u.XRANGEPLAIN]}$`), _("CARETLOOSE", `^${c[u.LONECARET]}${c[u.XRANGEPLAINLOOSE]}$`), _("COMPARATORLOOSE", `^${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]})$|^$`), _("COMPARATOR", `^${c[u.GTLT]}\\s*(${c[u.FULLPLAIN]})$|^$`), _("COMPARATORTRIM", `(\\s*)${c[u.GTLT]}\\s*(${c[u.LOOSEPLAIN]}|${c[u.XRANGEPLAIN]})`, !0), t.comparatorTrimReplace = "$1$2$3", _("HYPHENRANGE", `^\\s*(${c[u.XRANGEPLAIN]})\\s+-\\s+(${c[u.XRANGEPLAIN]})\\s*$`), _("HYPHENRANGELOOSE", `^\\s*(${c[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${c[u.XRANGEPLAINLOOSE]})\\s*$`), _("STAR", "(<|>)?=?\\s*\\*"), _("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), _("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
})(na, na.exports);
var cn = na.exports;
const aw = Object.freeze({ loose: !0 }), ow = Object.freeze({}), iw = (e) => e ? typeof e != "object" ? aw : e : ow;
var ei = iw;
const $c = /^[0-9]+$/, Ru = (e, t) => {
  if (typeof e == "number" && typeof t == "number")
    return e === t ? 0 : e < t ? -1 : 1;
  const r = $c.test(e), n = $c.test(t);
  return r && n && (e = +e, t = +t), e === t ? 0 : r && !n ? -1 : n && !r ? 1 : e < t ? -1 : 1;
}, cw = (e, t) => Ru(t, e);
var Ou = {
  compareIdentifiers: Ru,
  rcompareIdentifiers: cw
};
const Sn = fs, { MAX_LENGTH: yc, MAX_SAFE_INTEGER: Pn } = on, { safeRe: Nn, t: Rn } = cn, lw = ei, { compareIdentifiers: sa } = Ou, uw = (e, t) => {
  const r = t.split(".");
  if (r.length > e.length)
    return !1;
  for (let n = 0; n < r.length; n++)
    if (sa(e[n], r[n]) !== 0)
      return !1;
  return !0;
};
let dw = class lt {
  constructor(t, r) {
    if (r = lw(r), t instanceof lt) {
      if (t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease)
        return t;
      t = t.version;
    } else if (typeof t != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
    if (t.length > yc)
      throw new TypeError(
        `version is longer than ${yc} characters`
      );
    Sn("SemVer", t, r), this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease;
    const n = t.trim().match(r.loose ? Nn[Rn.LOOSE] : Nn[Rn.FULL]);
    if (!n)
      throw new TypeError(`Invalid Version: ${t}`);
    if (this.raw = t, this.major = +n[1], this.minor = +n[2], this.patch = +n[3], this.major > Pn || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > Pn || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > Pn || this.patch < 0)
      throw new TypeError("Invalid patch version");
    n[4] ? this.prerelease = n[4].split(".").map((s) => {
      if (/^[0-9]+$/.test(s)) {
        const a = +s;
        if (a >= 0 && a < Pn)
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
    if (Sn("SemVer.compare", this.version, this.options, t), !(t instanceof lt)) {
      if (typeof t == "string" && t === this.version)
        return 0;
      t = new lt(t, this.options);
    }
    return t.version === this.version ? 0 : this.compareMain(t) || this.comparePre(t);
  }
  compareMain(t) {
    return t instanceof lt || (t = new lt(t, this.options)), this.major < t.major ? -1 : this.major > t.major ? 1 : this.minor < t.minor ? -1 : this.minor > t.minor ? 1 : this.patch < t.patch ? -1 : this.patch > t.patch ? 1 : 0;
  }
  comparePre(t) {
    if (t instanceof lt || (t = new lt(t, this.options)), this.prerelease.length && !t.prerelease.length)
      return -1;
    if (!this.prerelease.length && t.prerelease.length)
      return 1;
    if (!this.prerelease.length && !t.prerelease.length)
      return 0;
    let r = 0;
    do {
      const n = this.prerelease[r], s = t.prerelease[r];
      if (Sn("prerelease compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return sa(n, s);
    } while (++r);
  }
  compareBuild(t) {
    t instanceof lt || (t = new lt(t, this.options));
    let r = 0;
    do {
      const n = this.build[r], s = t.build[r];
      if (Sn("build compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return sa(n, s);
    } while (++r);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(t, r, n) {
    if (t.startsWith("pre")) {
      if (!r && n === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (r) {
        const s = `-${r}`.match(this.options.loose ? Nn[Rn.PRERELEASELOOSE] : Nn[Rn.PRERELEASE]);
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
          if (n === !1 && (a = [r]), uw(this.prerelease, r)) {
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
var Me = dw;
const gc = Me, fw = (e, t, r = !1) => {
  if (e instanceof gc)
    return e;
  try {
    return new gc(e, t);
  } catch (n) {
    if (!r)
      return null;
    throw n;
  }
};
var or = fw;
const hw = or, mw = (e, t) => {
  const r = hw(e, t);
  return r ? r.version : null;
};
var pw = mw;
const $w = or, yw = (e, t) => {
  const r = $w(e.trim().replace(/^[=v]+/, ""), t);
  return r ? r.version : null;
};
var gw = yw;
const _c = Me, _w = (e, t, r, n, s) => {
  typeof r == "string" && (s = n, n = r, r = void 0);
  try {
    return new _c(
      e instanceof _c ? e.version : e,
      r
    ).inc(t, n, s).version;
  } catch {
    return null;
  }
};
var vw = _w;
const vc = or, ww = (e, t) => {
  const r = vc(e, null, !0), n = vc(t, null, !0), s = r.compare(n);
  if (s === 0)
    return null;
  const a = s > 0, o = a ? r : n, l = a ? n : r, c = !!o.prerelease.length;
  if (!!l.prerelease.length && !c) {
    if (!l.patch && !l.minor)
      return "major";
    if (l.compareMain(o) === 0)
      return l.minor && !l.patch ? "minor" : "patch";
  }
  const u = c ? "pre" : "";
  return r.major !== n.major ? u + "major" : r.minor !== n.minor ? u + "minor" : r.patch !== n.patch ? u + "patch" : "prerelease";
};
var Ew = ww;
const bw = Me, Sw = (e, t) => new bw(e, t).major;
var Pw = Sw;
const Nw = Me, Rw = (e, t) => new Nw(e, t).minor;
var Ow = Rw;
const Iw = Me, Tw = (e, t) => new Iw(e, t).patch;
var jw = Tw;
const Aw = or, kw = (e, t) => {
  const r = Aw(e, t);
  return r && r.prerelease.length ? r.prerelease : null;
};
var Cw = kw;
const wc = Me, Dw = (e, t, r) => new wc(e, r).compare(new wc(t, r));
var ot = Dw;
const Mw = ot, Vw = (e, t, r) => Mw(t, e, r);
var Lw = Vw;
const Fw = ot, zw = (e, t) => Fw(e, t, !0);
var Uw = zw;
const Ec = Me, qw = (e, t, r) => {
  const n = new Ec(e, r), s = new Ec(t, r);
  return n.compare(s) || n.compareBuild(s);
};
var ti = qw;
const Kw = ti, Gw = (e, t) => e.sort((r, n) => Kw(r, n, t));
var Hw = Gw;
const Bw = ti, Xw = (e, t) => e.sort((r, n) => Bw(n, r, t));
var Jw = Xw;
const Ww = ot, Yw = (e, t, r) => Ww(e, t, r) > 0;
var hs = Yw;
const Qw = ot, Zw = (e, t, r) => Qw(e, t, r) < 0;
var ri = Zw;
const xw = ot, eE = (e, t, r) => xw(e, t, r) === 0;
var Iu = eE;
const tE = ot, rE = (e, t, r) => tE(e, t, r) !== 0;
var Tu = rE;
const nE = ot, sE = (e, t, r) => nE(e, t, r) >= 0;
var ni = sE;
const aE = ot, oE = (e, t, r) => aE(e, t, r) <= 0;
var si = oE;
const iE = Iu, cE = Tu, lE = hs, uE = ni, dE = ri, fE = si, hE = (e, t, r, n) => {
  switch (t) {
    case "===":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e === r;
    case "!==":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e !== r;
    case "":
    case "=":
    case "==":
      return iE(e, r, n);
    case "!=":
      return cE(e, r, n);
    case ">":
      return lE(e, r, n);
    case ">=":
      return uE(e, r, n);
    case "<":
      return dE(e, r, n);
    case "<=":
      return fE(e, r, n);
    default:
      throw new TypeError(`Invalid operator: ${t}`);
  }
};
var ju = hE;
const mE = Me, pE = or, { safeRe: On, t: In } = cn, $E = (e, t) => {
  if (e instanceof mE)
    return e;
  if (typeof e == "number" && (e = String(e)), typeof e != "string")
    return null;
  t = t || {};
  let r = null;
  if (!t.rtl)
    r = e.match(t.includePrerelease ? On[In.COERCEFULL] : On[In.COERCE]);
  else {
    const c = t.includePrerelease ? On[In.COERCERTLFULL] : On[In.COERCERTL];
    let d;
    for (; (d = c.exec(e)) && (!r || r.index + r[0].length !== e.length); )
      (!r || d.index + d[0].length !== r.index + r[0].length) && (r = d), c.lastIndex = d.index + d[1].length + d[2].length;
    c.lastIndex = -1;
  }
  if (r === null)
    return null;
  const n = r[2], s = r[3] || "0", a = r[4] || "0", o = t.includePrerelease && r[5] ? `-${r[5]}` : "", l = t.includePrerelease && r[6] ? `+${r[6]}` : "";
  return pE(`${n}.${s}.${a}${o}${l}`, t);
};
var yE = $E;
const gE = or, _E = on, vE = Me, wE = (e, t, r) => {
  if (!_E.RELEASE_TYPES.includes(t))
    return null;
  const n = EE(e, r);
  return n && bE(n, t);
}, EE = (e, t) => {
  const r = e instanceof vE ? e.version : e;
  return gE(r, t);
}, bE = (e, t) => {
  if (SE(t))
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
}, SE = (e) => e.startsWith("pre");
var PE = wE;
class NE {
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
var RE = NE, Ts, bc;
function it() {
  if (bc) return Ts;
  bc = 1;
  const e = /\s+/g;
  class t {
    constructor(C, z) {
      if (z = s(z), C instanceof t)
        return C.loose === !!z.loose && C.includePrerelease === !!z.includePrerelease ? C : new t(C.raw, z);
      if (C instanceof a)
        return this.raw = C.value, this.set = [[C]], this.formatted = void 0, this;
      if (this.options = z, this.loose = !!z.loose, this.includePrerelease = !!z.includePrerelease, this.raw = C.trim().replace(e, " "), this.set = this.raw.split("||").map((P) => this.parseRange(P.trim())).filter((P) => P.length), !this.set.length)
        throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
      if (this.set.length > 1) {
        const P = this.set[0];
        if (this.set = this.set.filter((p) => !m(p[0])), this.set.length === 0)
          this.set = [P];
        else if (this.set.length > 1) {
          for (const p of this.set)
            if (p.length === 1 && E(p[0])) {
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
        for (let C = 0; C < this.set.length; C++) {
          C > 0 && (this.formatted += "||");
          const z = this.set[C];
          for (let P = 0; P < z.length; P++)
            P > 0 && (this.formatted += " "), this.formatted += z[P].toString().trim();
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
    parseRange(C) {
      C = C.replace(g, "");
      const P = ((this.options.includePrerelease && v) | (this.options.loose && _)) + ":" + C, p = n.get(P);
      if (p)
        return p;
      const S = this.options.loose, $ = S ? c[u.HYPHENRANGELOOSE] : c[u.HYPHENRANGE];
      C = C.replace($, ce(this.options.includePrerelease)), o("hyphen replace", C), C = C.replace(c[u.COMPARATORTRIM], h), o("comparator trim", C), C = C.replace(c[u.TILDETRIM], w), o("tilde trim", C), C = C.replace(c[u.CARETTRIM], y), o("caret trim", C);
      let i = C.split(" ").map((A) => O(A, this.options)).join(" ").split(/\s+/).map((A) => H(A, this.options));
      S && (i = i.filter((A) => (o("loose invalid filter", A, this.options), !!A.match(c[u.COMPARATORLOOSE])))), o("range list", i);
      const f = /* @__PURE__ */ new Map(), b = i.map((A) => new a(A, this.options));
      for (const A of b) {
        if (m(A))
          return [A];
        f.set(A.value, A);
      }
      f.size > 1 && f.has("") && f.delete("");
      const j = [...f.values()];
      return n.set(P, j), j;
    }
    intersects(C, z) {
      if (!(C instanceof t))
        throw new TypeError("a Range is required");
      return this.set.some((P) => R(P, z) && C.set.some((p) => R(p, z) && P.every((S) => p.every(($) => S.intersects($, z)))));
    }
    // if ANY of the sets match ALL of its comparators, then pass
    test(C) {
      if (!C)
        return !1;
      if (typeof C == "string")
        try {
          C = new l(C, this.options);
        } catch {
          return !1;
        }
      for (let z = 0; z < this.set.length; z++)
        if (ve(this.set[z], C, this.options))
          return !0;
      return !1;
    }
  }
  Ts = t;
  const r = RE, n = new r(), s = ei, a = ms(), o = fs, l = Me, {
    safeRe: c,
    src: d,
    t: u,
    comparatorTrimReplace: h,
    tildeTrimReplace: w,
    caretTrimReplace: y
  } = cn, { FLAG_INCLUDE_PRERELEASE: v, FLAG_LOOSE: _ } = on, g = new RegExp(d[u.BUILD], "g"), m = (M) => M.value === "<0.0.0-0", E = (M) => M.value === "", R = (M, C) => {
    let z = !0;
    const P = M.slice();
    let p = P.pop();
    for (; z && P.length; )
      z = P.every((S) => p.intersects(S, C)), p = P.pop();
    return z;
  }, O = (M, C) => (M = M.replace(c[u.BUILD], ""), o("comp", M, C), M = de(M, C), o("caret", M), M = J(M, C), o("tildes", M), M = q(M, C), o("xrange", M), M = W(M, C), o("stars", M), M), T = (M) => !M || M.toLowerCase() === "x" || M === "*", K = (M, C, z) => T(M) && !T(C) || T(C) && z && !T(z), J = (M, C) => M.trim().split(/\s+/).map((z) => ie(z, C)).join(" "), ie = (M, C) => {
    const z = C.loose ? c[u.TILDELOOSE] : c[u.TILDE], P = C.includePrerelease ? "-0" : "";
    return M.replace(z, (p, S, $, i, f) => {
      o("tilde", M, p, S, $, i, f);
      let b;
      return T(S) ? b = "" : T($) ? b = `>=${S}.0.0${P} <${+S + 1}.0.0-0` : T(i) ? b = `>=${S}.${$}.0${P} <${S}.${+$ + 1}.0-0` : f ? (o("replaceTilde pr", f), b = `>=${S}.${$}.${i}-${f} <${S}.${+$ + 1}.0-0`) : b = `>=${S}.${$}.${i} <${S}.${+$ + 1}.0-0`, o("tilde return", b), b;
    });
  }, de = (M, C) => M.trim().split(/\s+/).map((z) => pe(z, C)).join(" "), pe = (M, C) => {
    o("caret", M, C);
    const z = C.loose ? c[u.CARETLOOSE] : c[u.CARET], P = C.includePrerelease ? "-0" : "";
    return M.replace(z, (p, S, $, i, f) => {
      o("caret", M, p, S, $, i, f);
      let b;
      return T(S) ? b = "" : T($) ? b = `>=${S}.0.0${P} <${+S + 1}.0.0-0` : T(i) ? S === "0" ? b = `>=${S}.${$}.0${P} <${S}.${+$ + 1}.0-0` : b = `>=${S}.${$}.0${P} <${+S + 1}.0.0-0` : f ? (o("replaceCaret pr", f), S === "0" ? $ === "0" ? b = `>=${S}.${$}.${i}-${f} <${S}.${$}.${+i + 1}-0` : b = `>=${S}.${$}.${i}-${f} <${S}.${+$ + 1}.0-0` : b = `>=${S}.${$}.${i}-${f} <${+S + 1}.0.0-0`) : (o("no pr"), S === "0" ? $ === "0" ? b = `>=${S}.${$}.${i} <${S}.${$}.${+i + 1}-0` : b = `>=${S}.${$}.${i} <${S}.${+$ + 1}.0-0` : b = `>=${S}.${$}.${i} <${+S + 1}.0.0-0`), o("caret return", b), b;
    });
  }, q = (M, C) => (o("replaceXRanges", M, C), M.split(/\s+/).map((z) => X(z, C)).join(" ")), X = (M, C) => {
    M = M.trim();
    const z = C.loose ? c[u.XRANGELOOSE] : c[u.XRANGE];
    return M.replace(z, (P, p, S, $, i, f) => {
      if (o("xRange", M, P, p, S, $, i, f), K(S, $, i))
        return M;
      const b = T(S), j = b || T($), A = j || T(i), F = A;
      return p === "=" && F && (p = ""), f = C.includePrerelease ? "-0" : "", b ? p === ">" || p === "<" ? P = "<0.0.0-0" : P = "*" : p && F ? (j && ($ = 0), i = 0, p === ">" ? (p = ">=", j ? (S = +S + 1, $ = 0, i = 0) : ($ = +$ + 1, i = 0)) : p === "<=" && (p = "<", j ? S = +S + 1 : $ = +$ + 1), p === "<" && (f = "-0"), P = `${p + S}.${$}.${i}${f}`) : j ? P = `>=${S}.0.0${f} <${+S + 1}.0.0-0` : A && (P = `>=${S}.${$}.0${f} <${S}.${+$ + 1}.0-0`), o("xRange return", P), P;
    });
  }, W = (M, C) => (o("replaceStars", M, C), M.trim().replace(c[u.STAR], "")), H = (M, C) => (o("replaceGTE0", M, C), M.trim().replace(c[C.includePrerelease ? u.GTE0PRE : u.GTE0], "")), ce = (M) => (C, z, P, p, S, $, i, f, b, j, A, F) => (T(P) ? z = "" : T(p) ? z = `>=${P}.0.0${M ? "-0" : ""}` : T(S) ? z = `>=${P}.${p}.0${M ? "-0" : ""}` : $ ? z = `>=${z}` : z = `>=${z}${M ? "-0" : ""}`, T(b) ? f = "" : T(j) ? f = `<${+b + 1}.0.0-0` : T(A) ? f = `<${b}.${+j + 1}.0-0` : F ? f = `<=${b}.${j}.${A}-${F}` : M ? f = `<${b}.${j}.${+A + 1}-0` : f = `<=${f}`, `${z} ${f}`.trim()), ve = (M, C, z) => {
    for (let P = 0; P < M.length; P++)
      if (!M[P].test(C))
        return !1;
    if (C.prerelease.length && !z.includePrerelease) {
      for (let P = 0; P < M.length; P++)
        if (o(M[P].semver), M[P].semver !== a.ANY && M[P].semver.prerelease.length > 0) {
          const p = M[P].semver;
          if (p.major === C.major && p.minor === C.minor && p.patch === C.patch)
            return !0;
        }
      return !1;
    }
    return !0;
  };
  return Ts;
}
var js, Sc;
function ms() {
  if (Sc) return js;
  Sc = 1;
  const e = Symbol("SemVer ANY");
  class t {
    static get ANY() {
      return e;
    }
    constructor(u, h) {
      if (h = r(h), u instanceof t) {
        if (u.loose === !!h.loose)
          return u;
        u = u.value;
      }
      u = u.trim().split(/\s+/).join(" "), o("comparator", u, h), this.options = h, this.loose = !!h.loose, this.parse(u), this.semver === e ? this.value = "" : this.value = this.operator + this.semver.version, o("comp", this);
    }
    parse(u) {
      const h = this.options.loose ? n[s.COMPARATORLOOSE] : n[s.COMPARATOR], w = u.match(h);
      if (!w)
        throw new TypeError(`Invalid comparator: ${u}`);
      this.operator = w[1] !== void 0 ? w[1] : "", this.operator === "=" && (this.operator = ""), w[2] ? this.semver = new l(w[2], this.options.loose) : this.semver = e;
    }
    toString() {
      return this.value;
    }
    test(u) {
      if (o("Comparator.test", u, this.options.loose), this.semver === e || u === e)
        return !0;
      if (typeof u == "string")
        try {
          u = new l(u, this.options);
        } catch {
          return !1;
        }
      return a(u, this.operator, this.semver, this.options);
    }
    intersects(u, h) {
      if (!(u instanceof t))
        throw new TypeError("a Comparator is required");
      return this.operator === "" ? this.value === "" ? !0 : new c(u.value, h).test(this.value) : u.operator === "" ? u.value === "" ? !0 : new c(this.value, h).test(u.semver) : (h = r(h), h.includePrerelease && (this.value === "<0.0.0-0" || u.value === "<0.0.0-0") || !h.includePrerelease && (this.value.startsWith("<0.0.0") || u.value.startsWith("<0.0.0")) ? !1 : !!(this.operator.startsWith(">") && u.operator.startsWith(">") || this.operator.startsWith("<") && u.operator.startsWith("<") || this.semver.version === u.semver.version && this.operator.includes("=") && u.operator.includes("=") || a(this.semver, "<", u.semver, h) && this.operator.startsWith(">") && u.operator.startsWith("<") || a(this.semver, ">", u.semver, h) && this.operator.startsWith("<") && u.operator.startsWith(">")));
    }
  }
  js = t;
  const r = ei, { safeRe: n, t: s } = cn, a = ju, o = fs, l = Me, c = it();
  return js;
}
const OE = it(), IE = (e, t, r) => {
  try {
    t = new OE(t, r);
  } catch {
    return !1;
  }
  return t.test(e);
};
var ps = IE;
const TE = it(), jE = (e, t) => new TE(e, t).set.map((r) => r.map((n) => n.value).join(" ").trim().split(" "));
var AE = jE;
const kE = Me, CE = it(), DE = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new CE(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === -1) && (n = o, s = new kE(n, r));
  }), n;
};
var ME = DE;
const VE = Me, LE = it(), FE = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new LE(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === 1) && (n = o, s = new VE(n, r));
  }), n;
};
var zE = FE;
const As = Me, UE = it(), Pc = hs, qE = (e, t) => {
  e = new UE(e, t);
  let r = new As("0.0.0");
  if (e.test(r) || (r = new As("0.0.0-0"), e.test(r)))
    return r;
  r = null;
  for (let n = 0; n < e.set.length; ++n) {
    const s = e.set[n];
    let a = null;
    s.forEach((o) => {
      const l = new As(o.semver.version);
      switch (o.operator) {
        case ">":
          l.prerelease.length === 0 ? l.patch++ : l.prerelease.push(0), l.raw = l.format();
        case "":
        case ">=":
          (!a || Pc(l, a)) && (a = l);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${o.operator}`);
      }
    }), a && (!r || Pc(r, a)) && (r = a);
  }
  return r && e.test(r) ? r : null;
};
var KE = qE;
const GE = it(), HE = (e, t) => {
  try {
    return new GE(e, t).range || "*";
  } catch {
    return null;
  }
};
var BE = HE;
const XE = Me, Au = ms(), { ANY: JE } = Au, WE = it(), YE = ps, Nc = hs, Rc = ri, QE = si, ZE = ni, xE = (e, t, r, n) => {
  e = new XE(e, n), t = new WE(t, n);
  let s, a, o, l, c;
  switch (r) {
    case ">":
      s = Nc, a = QE, o = Rc, l = ">", c = ">=";
      break;
    case "<":
      s = Rc, a = ZE, o = Nc, l = "<", c = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (YE(e, t, n))
    return !1;
  for (let d = 0; d < t.set.length; ++d) {
    const u = t.set[d];
    let h = null, w = null;
    if (u.forEach((y) => {
      y.semver === JE && (y = new Au(">=0.0.0")), h = h || y, w = w || y, s(y.semver, h.semver, n) ? h = y : o(y.semver, w.semver, n) && (w = y);
    }), h.operator === l || h.operator === c || (!w.operator || w.operator === l) && a(e, w.semver))
      return !1;
    if (w.operator === c && o(e, w.semver))
      return !1;
  }
  return !0;
};
var ai = xE;
const eb = ai, tb = (e, t, r) => eb(e, t, ">", r);
var rb = tb;
const nb = ai, sb = (e, t, r) => nb(e, t, "<", r);
var ab = sb;
const Oc = it(), ob = (e, t, r) => (e = new Oc(e, r), t = new Oc(t, r), e.intersects(t, r));
var ib = ob;
const cb = ps, lb = ot;
var ub = (e, t, r) => {
  const n = [];
  let s = null, a = null;
  const o = e.sort((u, h) => lb(u, h, r));
  for (const u of o)
    cb(u, t, r) ? (a = u, s || (s = u)) : (a && n.push([s, a]), a = null, s = null);
  s && n.push([s, null]);
  const l = [];
  for (const [u, h] of n)
    u === h ? l.push(u) : !h && u === o[0] ? l.push("*") : h ? u === o[0] ? l.push(`<=${h}`) : l.push(`${u} - ${h}`) : l.push(`>=${u}`);
  const c = l.join(" || "), d = typeof t.raw == "string" ? t.raw : String(t);
  return c.length < d.length ? c : t;
};
const Ic = it(), oi = ms(), { ANY: ks } = oi, Cs = ps, ii = ot, db = (e, t, r = {}) => {
  if (e === t)
    return !0;
  e = new Ic(e, r), t = new Ic(t, r);
  let n = !1;
  e: for (const s of e.set) {
    for (const a of t.set) {
      const o = hb(s, a, r);
      if (n = n || o !== null, o)
        continue e;
    }
    if (n)
      return !1;
  }
  return !0;
}, fb = [new oi(">=0.0.0-0")], Tc = [new oi(">=0.0.0")], hb = (e, t, r) => {
  if (e === t)
    return !0;
  if (e.length === 1 && e[0].semver === ks) {
    if (t.length === 1 && t[0].semver === ks)
      return !0;
    r.includePrerelease ? e = fb : e = Tc;
  }
  if (t.length === 1 && t[0].semver === ks) {
    if (r.includePrerelease)
      return !0;
    t = Tc;
  }
  const n = /* @__PURE__ */ new Set();
  let s, a;
  for (const y of e)
    y.operator === ">" || y.operator === ">=" ? s = jc(s, y, r) : y.operator === "<" || y.operator === "<=" ? a = Ac(a, y, r) : n.add(y.semver);
  if (n.size > 1)
    return null;
  let o;
  if (s && a) {
    if (o = ii(s.semver, a.semver, r), o > 0)
      return null;
    if (o === 0 && (s.operator !== ">=" || a.operator !== "<="))
      return null;
  }
  for (const y of n) {
    if (s && !Cs(y, String(s), r) || a && !Cs(y, String(a), r))
      return null;
    for (const v of t)
      if (!Cs(y, String(v), r))
        return !1;
    return !0;
  }
  let l, c, d, u, h = a && !r.includePrerelease && a.semver.prerelease.length ? a.semver : !1, w = s && !r.includePrerelease && s.semver.prerelease.length ? s.semver : !1;
  h && h.prerelease.length === 1 && a.operator === "<" && h.prerelease[0] === 0 && (h = !1);
  for (const y of t) {
    if (u = u || y.operator === ">" || y.operator === ">=", d = d || y.operator === "<" || y.operator === "<=", s) {
      if (w && y.semver.prerelease && y.semver.prerelease.length && y.semver.major === w.major && y.semver.minor === w.minor && y.semver.patch === w.patch && (w = !1), y.operator === ">" || y.operator === ">=") {
        if (l = jc(s, y, r), l === y && l !== s)
          return !1;
      } else if (s.operator === ">=" && !y.test(s.semver))
        return !1;
    }
    if (a) {
      if (h && y.semver.prerelease && y.semver.prerelease.length && y.semver.major === h.major && y.semver.minor === h.minor && y.semver.patch === h.patch && (h = !1), y.operator === "<" || y.operator === "<=") {
        if (c = Ac(a, y, r), c === y && c !== a)
          return !1;
      } else if (a.operator === "<=" && !y.test(a.semver))
        return !1;
    }
    if (!y.operator && (a || s) && o !== 0)
      return !1;
  }
  return !(s && d && !a && o !== 0 || a && u && !s && o !== 0 || w || h);
}, jc = (e, t, r) => {
  if (!e)
    return t;
  const n = ii(e.semver, t.semver, r);
  return n > 0 ? e : n < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
}, Ac = (e, t, r) => {
  if (!e)
    return t;
  const n = ii(e.semver, t.semver, r);
  return n < 0 ? e : n > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
};
var mb = db;
const Ds = cn, kc = on, pb = Me, Cc = Ou, $b = or, yb = pw, gb = gw, _b = vw, vb = Ew, wb = Pw, Eb = Ow, bb = jw, Sb = Cw, Pb = ot, Nb = Lw, Rb = Uw, Ob = ti, Ib = Hw, Tb = Jw, jb = hs, Ab = ri, kb = Iu, Cb = Tu, Db = ni, Mb = si, Vb = ju, Lb = yE, Fb = PE, zb = ms(), Ub = it(), qb = ps, Kb = AE, Gb = ME, Hb = zE, Bb = KE, Xb = BE, Jb = ai, Wb = rb, Yb = ab, Qb = ib, Zb = ub, xb = mb;
var eS = {
  parse: $b,
  valid: yb,
  clean: gb,
  inc: _b,
  diff: vb,
  major: wb,
  minor: Eb,
  patch: bb,
  prerelease: Sb,
  compare: Pb,
  rcompare: Nb,
  compareLoose: Rb,
  compareBuild: Ob,
  sort: Ib,
  rsort: Tb,
  gt: jb,
  lt: Ab,
  eq: kb,
  neq: Cb,
  gte: Db,
  lte: Mb,
  cmp: Vb,
  coerce: Lb,
  truncate: Fb,
  Comparator: zb,
  Range: Ub,
  satisfies: qb,
  toComparators: Kb,
  maxSatisfying: Gb,
  minSatisfying: Hb,
  minVersion: Bb,
  validRange: Xb,
  outside: Jb,
  gtr: Wb,
  ltr: Yb,
  intersects: Qb,
  simplifyRange: Zb,
  subset: xb,
  SemVer: pb,
  re: Ds.re,
  src: Ds.src,
  tokens: Ds.t,
  SEMVER_SPEC_VERSION: kc.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: kc.RELEASE_TYPES,
  compareIdentifiers: Cc.compareIdentifiers,
  rcompareIdentifiers: Cc.rcompareIdentifiers
};
const ur = /* @__PURE__ */ Xc(eS), tS = Object.prototype.toString, rS = "[object Uint8Array]", nS = "[object ArrayBuffer]";
function ku(e, t, r) {
  return e ? e.constructor === t ? !0 : tS.call(e) === r : !1;
}
function Cu(e) {
  return ku(e, Uint8Array, rS);
}
function sS(e) {
  return ku(e, ArrayBuffer, nS);
}
function aS(e) {
  return Cu(e) || sS(e);
}
function oS(e) {
  if (!Cu(e))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof e}\``);
}
function iS(e) {
  if (!aS(e))
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
}
function Ms(e, t) {
  if (e.length === 0)
    return new Uint8Array(0);
  t ?? (t = e.reduce((s, a) => s + a.length, 0));
  const r = new Uint8Array(t);
  let n = 0;
  for (const s of e)
    oS(s), r.set(s, n), n += s.length;
  return r;
}
const Tn = {
  utf8: new globalThis.TextDecoder("utf8")
};
function jn(e, t = "utf8") {
  return iS(e), Tn[t] ?? (Tn[t] = new globalThis.TextDecoder(t)), Tn[t].decode(e);
}
function cS(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected \`string\`, got \`${typeof e}\``);
}
const lS = new globalThis.TextEncoder();
function Vs(e) {
  return cS(e), lS.encode(e);
}
Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
const Dc = "aes-256-cbc", Du = /* @__PURE__ */ new Set([
  "aes-256-cbc",
  "aes-256-gcm",
  "aes-256-ctr"
]), uS = (e) => typeof e == "string" && Du.has(e), _t = () => /* @__PURE__ */ Object.create(null), Mc = (e) => e !== void 0, Ls = (e, t) => {
  const r = /* @__PURE__ */ new Set([
    "undefined",
    "symbol",
    "function"
  ]), n = typeof t;
  if (r.has(n))
    throw new TypeError(`Setting a value of type \`${n}\` for key \`${e}\` is not allowed as it's not supported by JSON`);
}, At = "__internal__", Fs = `${At}.migrations.version`;
var Dt, Mt, Zt, Ue, Be, xt, er, wr, ut, Pe, Mu, Vu, Lu, Fu, zu, Uu, qu, Ku;
class dS {
  constructor(t = {}) {
    Ye(this, Pe);
    Dr(this, "path");
    Dr(this, "events");
    Ye(this, Dt);
    Ye(this, Mt);
    Ye(this, Zt);
    Ye(this, Ue);
    Ye(this, Be, {});
    Ye(this, xt, !1);
    Ye(this, er);
    Ye(this, wr);
    Ye(this, ut);
    Dr(this, "_deserialize", (t) => JSON.parse(t));
    Dr(this, "_serialize", (t) => JSON.stringify(t, void 0, "	"));
    const r = pt(this, Pe, Mu).call(this, t);
    ze(this, Ue, r), pt(this, Pe, Vu).call(this, r), pt(this, Pe, Fu).call(this, r), pt(this, Pe, zu).call(this, r), this.events = new EventTarget(), ze(this, Mt, r.encryptionKey), ze(this, Zt, r.encryptionAlgorithm ?? Dc), this.path = pt(this, Pe, Uu).call(this, r), pt(this, Pe, qu).call(this, r), r.watch && this._watch();
  }
  get(t, r) {
    if (Z(this, Ue).accessPropertiesByDotNotation)
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
      throw new TypeError(`Please don't use the ${At} key, as it's used to manage this module internal operations.`);
    const { store: n } = this, s = (a, o) => {
      if (Ls(a, o), Z(this, Ue).accessPropertiesByDotNotation)
        ln(n, a, o);
      else {
        if (a === "__proto__" || a === "constructor" || a === "prototype")
          return;
        n[a] = o;
      }
    };
    if (typeof t == "object") {
      const a = t;
      for (const [o, l] of Object.entries(a))
        s(o, l);
    } else
      s(t, r);
    this.store = n;
  }
  has(t) {
    return Z(this, Ue).accessPropertiesByDotNotation ? _s(this.store, t) : t in this.store;
  }
  appendToArray(t, r) {
    Ls(t, r);
    const n = Z(this, Ue).accessPropertiesByDotNotation ? this._get(t, []) : t in this.store ? this.store[t] : [];
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
      Mc(Z(this, Be)[r]) && this.set(r, Z(this, Be)[r]);
  }
  delete(t) {
    const { store: r } = this;
    Z(this, Ue).accessPropertiesByDotNotation ? Zu(r, t) : delete r[t], this.store = r;
  }
  /**
      Delete all items.
  
      This resets known items to their default values, if defined by the `defaults` or `schema` option.
      */
  clear() {
    const t = _t();
    for (const r of Object.keys(Z(this, Be)))
      Mc(Z(this, Be)[r]) && (Ls(r, Z(this, Be)[r]), Z(this, Ue).accessPropertiesByDotNotation ? ln(t, r, Z(this, Be)[r]) : t[r] = Z(this, Be)[r]);
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
      const r = x.readFileSync(this.path, Z(this, Mt) ? null : "utf8"), n = this._decryptData(r);
      return ((a) => {
        const o = this._deserialize(a);
        return Z(this, xt) || this._validate(o), Object.assign(_t(), o);
      })(n);
    } catch (r) {
      if ((r == null ? void 0 : r.code) === "ENOENT")
        return this._ensureDirectory(), _t();
      if (Z(this, Ue).clearInvalidConfig) {
        const n = r;
        if (n.name === "SyntaxError" || (t = n.message) != null && t.startsWith("Config schema violation:") || n.message === "Failed to decrypt config data.")
          return _t();
      }
      throw r;
    }
  }
  set store(t) {
    if (this._ensureDirectory(), !_s(t, At))
      try {
        const r = x.readFileSync(this.path, Z(this, Mt) ? null : "utf8"), n = this._decryptData(r), s = this._deserialize(n);
        _s(s, At) && ln(t, At, di(s, At));
      } catch {
      }
    Z(this, xt) || this._validate(t), this._write(t), this.events.dispatchEvent(new Event("change"));
  }
  *[Symbol.iterator]() {
    for (const [t, r] of Object.entries(this.store))
      this._isReservedKeyPath(t) || (yield [t, r]);
  }
  /**
  Close the file watcher if one exists. This is useful in tests to prevent the process from hanging.
  */
  _closeWatcher() {
    Z(this, er) && (Z(this, er).close(), ze(this, er, void 0)), Z(this, wr) && (x.unwatchFile(this.path), ze(this, wr, !1)), ze(this, ut, void 0);
  }
  _decryptData(t) {
    const r = Z(this, Mt);
    if (!r)
      return typeof t == "string" ? t : jn(t);
    const n = Z(this, Zt), s = n === "aes-256-gcm" ? 16 : 0, a = ":".codePointAt(0), o = typeof t == "string" ? t.codePointAt(16) : t[16];
    if (!(a !== void 0 && o === a)) {
      if (n === "aes-256-cbc")
        return typeof t == "string" ? t : jn(t);
      throw new Error("Failed to decrypt config data.");
    }
    const c = (y) => {
      if (s === 0)
        return { ciphertext: y };
      const v = y.length - s;
      if (v < 0)
        throw new Error("Invalid authentication tag length.");
      return {
        ciphertext: y.slice(0, v),
        authenticationTag: y.slice(v)
      };
    }, d = t.slice(0, 16), u = t.slice(17), h = typeof u == "string" ? Vs(u) : u, w = (y) => {
      const { ciphertext: v, authenticationTag: _ } = c(h), g = Mr.pbkdf2Sync(r, y, 1e4, 32, "sha512"), m = Mr.createDecipheriv(n, g, d);
      return _ && m.setAuthTag(_), jn(Ms([m.update(v), m.final()]));
    };
    try {
      return w(d);
    } catch {
      try {
        return w(d.toString());
      } catch {
      }
    }
    if (n === "aes-256-cbc")
      return typeof t == "string" ? t : jn(t);
    throw new Error("Failed to decrypt config data.");
  }
  _handleStoreChange(t) {
    let r = this.store;
    const n = () => {
      const s = r, a = this.store;
      li(a, s) || (r = a, t.call(this, a, s));
    };
    return this.events.addEventListener("change", n), () => {
      this.events.removeEventListener("change", n);
    };
  }
  _handleValueChange(t, r) {
    let n = t();
    const s = () => {
      const a = n, o = t();
      li(o, a) || (n = o, r.call(this, o, a));
    };
    return this.events.addEventListener("change", s), () => {
      this.events.removeEventListener("change", s);
    };
  }
  _validate(t) {
    if (!Z(this, Dt) || Z(this, Dt).call(this, t) || !Z(this, Dt).errors)
      return;
    const n = Z(this, Dt).errors.map(({ instancePath: s, message: a = "" }) => `\`${s.slice(1)}\` ${a}`);
    throw new Error("Config schema violation: " + n.join("; "));
  }
  _ensureDirectory() {
    x.mkdirSync(se.dirname(this.path), { recursive: !0 });
  }
  _write(t) {
    let r = this._serialize(t);
    const n = Z(this, Mt);
    if (n) {
      const s = Mr.randomBytes(16), a = Mr.pbkdf2Sync(n, s, 1e4, 32, "sha512"), o = Mr.createCipheriv(Z(this, Zt), a, s), l = Ms([o.update(Vs(r)), o.final()]), c = [s, Vs(":"), l];
      Z(this, Zt) === "aes-256-gcm" && c.push(o.getAuthTag()), r = Ms(c);
    }
    if (me.env.SNAP)
      x.writeFileSync(this.path, r, { mode: Z(this, Ue).configFileMode });
    else
      try {
        Bc(this.path, r, { mode: Z(this, Ue).configFileMode });
      } catch (s) {
        if ((s == null ? void 0 : s.code) === "EXDEV") {
          x.writeFileSync(this.path, r, { mode: Z(this, Ue).configFileMode });
          return;
        }
        throw s;
      }
  }
  _watch() {
    if (this._ensureDirectory(), x.existsSync(this.path) || this._write(_t()), me.platform === "win32" || me.platform === "darwin") {
      Z(this, ut) ?? ze(this, ut, pc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 100 }));
      const t = se.dirname(this.path), r = se.basename(this.path);
      ze(this, er, x.watch(t, { persistent: !1, encoding: "utf8" }, (n, s) => {
        s && s !== r || typeof Z(this, ut) == "function" && Z(this, ut).call(this);
      }));
    } else
      Z(this, ut) ?? ze(this, ut, pc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 1e3 })), x.watchFile(this.path, { persistent: !1 }, (t, r) => {
        typeof Z(this, ut) == "function" && Z(this, ut).call(this);
      }), ze(this, wr, !0);
  }
  _migrate(t, r, n) {
    let s = this._get(Fs, "0.0.0");
    const a = Object.keys(t).filter((l) => this._shouldPerformMigration(l, s, r));
    let o = structuredClone(this.store);
    for (const l of a)
      try {
        n && n(this, {
          fromVersion: s,
          toVersion: l,
          finalVersion: r,
          versions: a
        });
        const c = t[l];
        c == null || c(this), this._set(Fs, l), s = l, o = structuredClone(this.store);
      } catch (c) {
        this.store = o;
        const d = c instanceof Error ? c.message : String(c);
        throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${d}`);
      }
    (this._isVersionInRangeFormat(s) || !ur.eq(s, r)) && this._set(Fs, r);
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
    return t === At || t.startsWith(`${At}.`);
  }
  _isVersionInRangeFormat(t) {
    return ur.clean(t) === null;
  }
  _shouldPerformMigration(t, r, n) {
    return this._isVersionInRangeFormat(t) ? r !== "0.0.0" && ur.satisfies(r, t) ? !1 : ur.satisfies(n, t) : !(ur.lte(t, r) || ur.gt(t, n));
  }
  _get(t, r) {
    return di(this.store, t, r);
  }
  _set(t, r) {
    const { store: n } = this;
    ln(n, t, r), this.store = n;
  }
}
Dt = new WeakMap(), Mt = new WeakMap(), Zt = new WeakMap(), Ue = new WeakMap(), Be = new WeakMap(), xt = new WeakMap(), er = new WeakMap(), wr = new WeakMap(), ut = new WeakMap(), Pe = new WeakSet(), Mu = function(t) {
  const r = {
    configName: "config",
    fileExtension: "json",
    projectSuffix: "nodejs",
    clearInvalidConfig: !1,
    accessPropertiesByDotNotation: !0,
    configFileMode: 438,
    ...t
  };
  if (r.encryptionAlgorithm ?? (r.encryptionAlgorithm = Dc), !uS(r.encryptionAlgorithm))
    throw new TypeError(`The \`encryptionAlgorithm\` option must be one of: ${[...Du].join(", ")}`);
  if (!r.cwd) {
    if (!r.projectName)
      throw new Error("Please specify the `projectName` option.");
    r.cwd = rd(r.projectName, { suffix: r.projectSuffix }).config;
  }
  return typeof r.fileExtension == "string" && (r.fileExtension = r.fileExtension.replace(/^\.+/, "")), r;
}, Vu = function(t) {
  if (!(t.schema ?? t.ajvOptions ?? t.rootSchema))
    return;
  if (t.schema && typeof t.schema != "object")
    throw new TypeError("The `schema` option must be an object.");
  const r = Gv.default, n = new Ay.Ajv2020({
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
  ze(this, Dt, n.compile(s)), pt(this, Pe, Lu).call(this, t.schema);
}, Lu = function(t) {
  const r = Object.entries(t ?? {});
  for (const [n, s] of r) {
    if (!s || typeof s != "object" || !Object.hasOwn(s, "default"))
      continue;
    const { default: a } = s;
    a !== void 0 && (Z(this, Be)[n] = a);
  }
}, Fu = function(t) {
  t.defaults && Object.assign(Z(this, Be), t.defaults);
}, zu = function(t) {
  t.serialize && (this._serialize = t.serialize), t.deserialize && (this._deserialize = t.deserialize);
}, Uu = function(t) {
  const r = typeof t.fileExtension == "string" ? t.fileExtension : void 0, n = r ? `.${r}` : "";
  return se.resolve(t.cwd, `${t.configName ?? "config"}${n}`);
}, qu = function(t) {
  if (t.migrations) {
    pt(this, Pe, Ku).call(this, t), this._validate(this.store);
    return;
  }
  const r = this.store, n = Object.assign(_t(), t.defaults ?? {}, r);
  this._validate(n);
  try {
    ui.deepEqual(r, n);
  } catch {
    this.store = n;
  }
}, Ku = function(t) {
  const { migrations: r, projectVersion: n } = t;
  if (r) {
    if (!n)
      throw new Error("Please specify the `projectVersion` option.");
    ze(this, xt, !0);
    try {
      const s = this.store, a = Object.assign(_t(), t.defaults ?? {}, s);
      try {
        ui.deepEqual(s, a);
      } catch {
        this._write(a);
      }
      this._migrate(r, n, t.beforeEachMigration);
    } finally {
      ze(this, xt, !1);
    }
  }
};
const { app: Un, ipcMain: aa, shell: fS } = Fc;
let Vc = !1;
const Lc = () => {
  if (!aa || !Un)
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  const e = {
    defaultCwd: Un.getPath("userData"),
    appVersion: Un.getVersion()
  };
  return Vc || (aa.on("electron-store-get-data", (t) => {
    t.returnValue = e;
  }), Vc = !0), e;
};
class hS extends dS {
  constructor(t) {
    let r, n;
    if (me.type === "renderer") {
      const s = Fc.ipcRenderer.sendSync("electron-store-get-data");
      if (!s)
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      ({ defaultCwd: r, appVersion: n } = s);
    } else aa && Un && ({ defaultCwd: r, appVersion: n } = Lc());
    t = {
      name: "config",
      ...t
    }, t.projectVersion || (t.projectVersion = n), t.cwd ? t.cwd = se.isAbsolute(t.cwd) ? t.cwd : se.join(r, t.cwd) : t.cwd = r, t.configName = t.name, delete t.name, super(t);
  }
  static initRenderer() {
    Lc();
  }
  async openInEditor() {
    const t = await fS.openPath(this.path);
    if (t)
      throw new Error(t);
  }
}
const ft = new hS(), Gu = se.dirname(Wu(import.meta.url));
process.env.APP_ROOT = se.join(Gu, "..");
const oa = process.env.VITE_DEV_SERVER_URL, RS = se.join(process.env.APP_ROOT, "dist-electron"), Hu = se.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = oa ? se.join(process.env.APP_ROOT, "public") : Hu;
let kt;
ia.handle("preferences:get", () => ft.store);
ia.handle(
  "preferences:set",
  (e, t) => (typeof t.locale == "string" && ft.set("locale", t.locale), typeof t.nickname == "string" && ft.set("nickname", t.nickname), typeof t.category == "string" && ft.set("category", t.category), typeof t.role == "string" && ft.set("role", t.role), ft.store)
);
ia.handle("preferences:reset-onboarding", () => (ft.delete("nickname"), ft.delete("category"), ft.delete("role"), ft.store));
function Bu() {
  kt = new zc({
    icon: se.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: se.join(Gu, "preload.mjs")
    }
  }), kt.webContents.on("did-finish-load", () => {
    kt == null || kt.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), oa ? kt.loadURL(oa) : kt.loadFile(se.join(Hu, "index.html"));
}
qn.on("window-all-closed", () => {
  process.platform !== "darwin" && (qn.quit(), kt = null);
});
qn.on("activate", () => {
  zc.getAllWindows().length === 0 && Bu();
});
qn.whenReady().then(Bu);
export {
  RS as MAIN_DIST,
  Hu as RENDERER_DIST,
  oa as VITE_DEV_SERVER_URL
};
