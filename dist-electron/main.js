var Ju = Object.defineProperty;
var li = (e) => {
  throw TypeError(e);
};
var Wu = (e, t, r) => t in e ? Ju(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var Mr = (e, t, r) => Wu(e, typeof t != "symbol" ? t + "" : t, r), $s = (e, t, r) => t.has(e) || li("Cannot " + r);
var Z = (e, t, r) => ($s(e, t, "read from private field"), r ? r.call(e) : t.get(e)), Qe = (e, t, r) => t.has(e) ? li("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), ze = (e, t, r, n) => ($s(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), mt = (e, t, r) => ($s(e, t, "access private method"), r);
import Uc, { ipcMain as ca, app as Un, BrowserWindow as qc } from "electron";
import { fileURLToPath as Yu } from "node:url";
import se from "node:path";
import me from "node:process";
import { promisify as je, isDeepStrictEqual as ui } from "node:util";
import x from "node:fs";
import Vr from "node:crypto";
import di from "node:assert";
import Kc from "node:os";
import "node:events";
import "node:stream";
const tr = (e) => {
  const t = typeof e;
  return e !== null && (t === "object" || t === "function");
}, Gc = /* @__PURE__ */ new Set([
  "__proto__",
  "prototype",
  "constructor"
]), Hc = 1e6, Qu = (e) => e >= "0" && e <= "9";
function Bc(e) {
  if (e === "0")
    return !0;
  if (/^[1-9]\d*$/.test(e)) {
    const t = Number.parseInt(e, 10);
    return t <= Number.MAX_SAFE_INTEGER && t <= Hc;
  }
  return !1;
}
function ys(e, t) {
  return Gc.has(e) ? !1 : (e && Bc(e) ? t.push(Number.parseInt(e, 10)) : t.push(e), !0);
}
function Zu(e) {
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
        if (!ys(r, t))
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
          if ((r || n === "property") && !ys(r, t))
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
            !Number.isNaN(l) && Number.isFinite(l) && l >= 0 && l <= Number.MAX_SAFE_INTEGER && l <= Hc && r === String(l) ? t.push(l) : t.push(r), r = "", n = "indexEnd";
          }
          break;
        }
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        r += o;
        break;
      }
      default: {
        if (n === "index" && !Qu(o))
          throw new Error(`Invalid character '${o}' in an index at position ${a}`);
        if (n === "indexEnd")
          throw new Error(`Invalid character '${o}' after an index at position ${a}`);
        n === "start" && (n = "property"), r += o;
      }
    }
  }
  switch (s && (r += "\\"), n) {
    case "property": {
      if (!ys(r, t))
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
function Yn(e) {
  if (typeof e == "string")
    return Zu(e);
  if (Array.isArray(e)) {
    const t = [];
    for (const [r, n] of e.entries()) {
      if (typeof n != "string" && typeof n != "number")
        throw new TypeError(`Expected a string or number for path segment at index ${r}, got ${typeof n}`);
      if (typeof n == "number" && !Number.isFinite(n))
        throw new TypeError(`Path segment at index ${r} must be a finite number, got ${n}`);
      if (Gc.has(n))
        return [];
      typeof n == "string" && Bc(n) ? t.push(Number.parseInt(n, 10)) : t.push(n);
    }
    return t;
  }
  return [];
}
function fi(e, t, r) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return r === void 0 ? e : r;
  const n = Yn(t);
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
  const n = e, s = Yn(t);
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
function xu(e, t) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = Yn(t);
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
function gs(e, t) {
  if (!tr(e) || typeof t != "string" && !Array.isArray(t))
    return !1;
  const r = Yn(t);
  if (r.length === 0)
    return !1;
  for (const n of r) {
    if (!tr(e) || !(n in e))
      return !1;
    e = e[n];
  }
  return !0;
}
const kt = Kc.homedir(), la = Kc.tmpdir(), { env: hr } = me, ed = (e) => {
  const t = se.join(kt, "Library");
  return {
    data: se.join(t, "Application Support", e),
    config: se.join(t, "Preferences", e),
    cache: se.join(t, "Caches", e),
    log: se.join(t, "Logs", e),
    temp: se.join(la, e)
  };
}, td = (e) => {
  const t = hr.APPDATA || se.join(kt, "AppData", "Roaming"), r = hr.LOCALAPPDATA || se.join(kt, "AppData", "Local");
  return {
    // Data/config/cache/log are invented by me as Windows isn't opinionated about this
    data: se.join(r, e, "Data"),
    config: se.join(t, e, "Config"),
    cache: se.join(r, e, "Cache"),
    log: se.join(r, e, "Log"),
    temp: se.join(la, e)
  };
}, rd = (e) => {
  const t = se.basename(kt);
  return {
    data: se.join(hr.XDG_DATA_HOME || se.join(kt, ".local", "share"), e),
    config: se.join(hr.XDG_CONFIG_HOME || se.join(kt, ".config"), e),
    cache: se.join(hr.XDG_CACHE_HOME || se.join(kt, ".cache"), e),
    // https://wiki.debian.org/XDGBaseDirectorySpecification#state
    log: se.join(hr.XDG_STATE_HOME || se.join(kt, ".local", "state"), e),
    temp: se.join(la, t, e)
  };
};
function nd(e, { suffix: t = "nodejs" } = {}) {
  if (typeof e != "string")
    throw new TypeError(`Expected a string, got ${typeof e}`);
  return t && (e += `-${t}`), me.platform === "darwin" ? ed(e) : me.platform === "win32" ? td(e) : rd(e);
}
const bt = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    return e.apply(void 0, s).catch(r);
  };
}, pt = (e, t) => {
  const { onError: r } = t;
  return function(...s) {
    try {
      return e.apply(void 0, s);
    } catch (a) {
      return r(a);
    }
  };
}, sd = 250, St = (e, t) => {
  const { isRetriable: r } = t;
  return function(s) {
    const { timeout: a } = s, o = s.interval ?? sd, l = Date.now() + a;
    return function c(...d) {
      return e.apply(void 0, d).catch((u) => {
        if (!r(u) || Date.now() >= l)
          throw u;
        const h = Math.round(o * Math.random());
        return h > 0 ? new Promise((y) => setTimeout(y, h)).then(() => c.apply(void 0, d)) : c.apply(void 0, d);
      });
    };
  };
}, Pt = (e, t) => {
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
    return t === "ENOSYS" || !ad && (t === "EINVAL" || t === "EPERM");
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
}, ad = me.getuid ? !me.getuid() : !1, Ae = {
  isRetriable: mr.isRetriableError
}, Ce = {
  attempt: {
    /* ASYNC */
    chmod: bt(je(x.chmod), un),
    chown: bt(je(x.chown), un),
    close: bt(je(x.close), He),
    fsync: bt(je(x.fsync), He),
    mkdir: bt(je(x.mkdir), He),
    realpath: bt(je(x.realpath), He),
    stat: bt(je(x.stat), He),
    unlink: bt(je(x.unlink), He),
    /* SYNC */
    chmodSync: pt(x.chmodSync, un),
    chownSync: pt(x.chownSync, un),
    closeSync: pt(x.closeSync, He),
    existsSync: pt(x.existsSync, He),
    fsyncSync: pt(x.fsync, He),
    mkdirSync: pt(x.mkdirSync, He),
    realpathSync: pt(x.realpathSync, He),
    statSync: pt(x.statSync, He),
    unlinkSync: pt(x.unlinkSync, He)
  },
  retry: {
    /* ASYNC */
    close: St(je(x.close), Ae),
    fsync: St(je(x.fsync), Ae),
    open: St(je(x.open), Ae),
    readFile: St(je(x.readFile), Ae),
    rename: St(je(x.rename), Ae),
    stat: St(je(x.stat), Ae),
    write: St(je(x.write), Ae),
    writeFile: St(je(x.writeFile), Ae),
    /* SYNC */
    closeSync: Pt(x.closeSync, Ae),
    fsyncSync: Pt(x.fsyncSync, Ae),
    openSync: Pt(x.openSync, Ae),
    readFileSync: Pt(x.readFileSync, Ae),
    renameSync: Pt(x.renameSync, Ae),
    statSync: Pt(x.statSync, Ae),
    writeSync: Pt(x.writeSync, Ae),
    writeFileSync: Pt(x.writeFileSync, Ae)
  }
}, od = "utf8", hi = 438, id = 511, cd = {}, ld = me.geteuid ? me.geteuid() : -1, ud = me.getegid ? me.getegid() : -1, dd = 1e3, fd = !!me.getuid;
me.getuid && me.getuid();
const mi = 128, hd = (e) => e instanceof Error && "code" in e, pi = (e) => typeof e == "string", _s = (e) => e === void 0, md = me.platform === "linux", Xc = me.platform === "win32", ua = ["SIGHUP", "SIGINT", "SIGTERM"];
Xc || ua.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
md && ua.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
class pd {
  /* CONSTRUCTOR */
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set(), this.exited = !1, this.exit = (t) => {
      if (!this.exited) {
        this.exited = !0;
        for (const r of this.callbacks)
          r();
        t && (Xc && t !== "SIGINT" && t !== "SIGTERM" && t !== "SIGKILL" ? me.kill(me.pid, "SIGTERM") : me.kill(me.pid, t));
      }
    }, this.hook = () => {
      me.once("exit", () => this.exit());
      for (const t of ua)
        try {
          me.once(t, () => this.exit(t));
        } catch {
        }
    }, this.register = (t) => (this.callbacks.add(t), () => {
      this.callbacks.delete(t);
    }), this.hook();
  }
}
const $d = new pd(), yd = $d.register, De = {
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
    if (t.length <= mi)
      return e;
    const r = /^(\.?)(.*?)((?:\.[^.]+)?(?:\.tmp-\d{10}[a-f0-9]{6})?)$/.exec(t);
    if (!r)
      return e;
    const n = t.length - mi;
    return `${e.slice(0, -t.length)}${r[1]}${r[2].slice(0, -n)}${r[3]}`;
  }
};
yd(De.purgeSyncAll);
function Jc(e, t, r = cd) {
  if (pi(r))
    return Jc(e, t, { encoding: r });
  const s = { timeout: r.timeout ?? dd };
  let a = null, o = null, l = null;
  try {
    const c = Ce.attempt.realpathSync(e), d = !!c;
    e = c || e, [o, a] = De.get(e, r.tmpCreate || De.create, r.tmpPurge !== !1);
    const u = fd && _s(r.chown), h = _s(r.mode);
    if (d && (u || h)) {
      const w = Ce.attempt.statSync(e);
      w && (r = { ...r }, u && (r.chown = { uid: w.uid, gid: w.gid }), h && (r.mode = w.mode));
    }
    if (!d) {
      const w = se.dirname(e);
      Ce.attempt.mkdirSync(w, {
        mode: id,
        recursive: !0
      });
    }
    l = Ce.retry.openSync(s)(o, "w", r.mode || hi), r.tmpCreated && r.tmpCreated(o), pi(t) ? Ce.retry.writeSync(s)(l, t, 0, r.encoding || od) : _s(t) || Ce.retry.writeSync(s)(l, t, 0, t.length, 0), r.fsync !== !1 && (r.fsyncWait !== !1 ? Ce.retry.fsyncSync(s)(l) : Ce.attempt.fsync(l)), Ce.retry.closeSync(s)(l), l = null, r.chown && (r.chown.uid !== ld || r.chown.gid !== ud) && Ce.attempt.chownSync(o, r.chown.uid, r.chown.gid), r.mode && r.mode !== hi && Ce.attempt.chmodSync(o, r.mode);
    try {
      Ce.retry.renameSync(s)(o, e);
    } catch (w) {
      if (!hd(w) || w.code !== "ENAMETOOLONG")
        throw w;
      Ce.retry.renameSync(s)(o, De.truncate(e));
    }
    a(), o = null;
  } finally {
    l && Ce.attempt.closeSync(l), o && De.purge(o);
  }
}
function Wc(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Us = { exports: {} }, Yc = {}, at = {}, Er = {}, rn = {}, ee = {}, en = {};
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
var qs = {};
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
})(qs);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = en, r = qs;
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
  var s = qs;
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
const le = ee, gd = en;
function _d(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
V.toHash = _d;
function vd(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (Qc(e, t), !Zc(t, e.self.RULES.all));
}
V.alwaysValidSchema = vd;
function Qc(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || tl(e, `unknown keyword: "${a}"`);
}
V.checkUnknownRules = Qc;
function Zc(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
V.schemaHasRules = Zc;
function wd(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
V.schemaHasRulesButRef = wd;
function Ed({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, le._)`${r}`;
  }
  return (0, le._)`${e}${t}${(0, le.getProperty)(n)}`;
}
V.schemaRefOrVal = Ed;
function bd(e) {
  return xc(decodeURIComponent(e));
}
V.unescapeFragment = bd;
function Sd(e) {
  return encodeURIComponent(da(e));
}
V.escapeFragment = Sd;
function da(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
V.escapeJsonPointer = da;
function xc(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
V.unescapeJsonPointer = xc;
function Pd(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
V.eachItem = Pd;
function $i({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, l) => {
    const c = o === void 0 ? a : o instanceof le.Name ? (a instanceof le.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof le.Name ? (t(s, o, a), a) : r(a, o);
    return l === le.Name && !(c instanceof le.Name) ? n(s, c) : c;
  };
}
V.mergeEvaluated = {
  props: $i({
    mergeNames: (e, t, r) => e.if((0, le._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, le._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, le._)`${r} || {}`).code((0, le._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, le._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, le._)`${r} || {}`), fa(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: el
  }),
  items: $i({
    mergeNames: (e, t, r) => e.if((0, le._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, le._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, le._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, le._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function el(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, le._)`{}`);
  return t !== void 0 && fa(e, r, t), r;
}
V.evaluatedPropsToName = el;
function fa(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, le._)`${t}${(0, le.getProperty)(n)}`, !0));
}
V.setEvaluated = fa;
const yi = {};
function Nd(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: yi[t.code] || (yi[t.code] = new gd._Code(t.code))
  });
}
V.useFunc = Nd;
var Ks;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(Ks || (V.Type = Ks = {}));
function Rd(e, t, r) {
  if (e instanceof le.Name) {
    const n = t === Ks.Num;
    return r ? n ? (0, le._)`"[" + ${e} + "]"` : (0, le._)`"['" + ${e} + "']"` : n ? (0, le._)`"/" + ${e}` : (0, le._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, le.getProperty)(e).toString() : "/" + da(e);
}
V.getErrorPath = Rd;
function tl(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
V.checkStrictMode = tl;
var Be = {};
Object.defineProperty(Be, "__esModule", { value: !0 });
const ke = ee, Od = {
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
Be.default = Od;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = ee, r = V, n = Be;
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
})(rn);
Object.defineProperty(Er, "__esModule", { value: !0 });
Er.boolOrEmptySchema = Er.topBoolOrEmptySchema = void 0;
const Id = rn, Td = ee, jd = Be, Ad = {
  message: "boolean schema is false"
};
function kd(e) {
  const { gen: t, schema: r, validateName: n } = e;
  r === !1 ? rl(e, !1) : typeof r == "object" && r.$async === !0 ? t.return(jd.default.data) : (t.assign((0, Td._)`${n}.errors`, null), t.return(!0));
}
Er.topBoolOrEmptySchema = kd;
function Cd(e, t) {
  const { gen: r, schema: n } = e;
  n === !1 ? (r.var(t, !1), rl(e)) : r.var(t, !0);
}
Er.boolOrEmptySchema = Cd;
function rl(e, t) {
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
  (0, Id.reportError)(s, Ad, void 0, t);
}
var we = {}, rr = {};
Object.defineProperty(rr, "__esModule", { value: !0 });
rr.getRules = rr.isJSONType = void 0;
const Dd = ["string", "number", "integer", "boolean", "null", "object", "array"], Md = new Set(Dd);
function Vd(e) {
  return typeof e == "string" && Md.has(e);
}
rr.isJSONType = Vd;
function Ld() {
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
rr.getRules = Ld;
var vt = {};
Object.defineProperty(vt, "__esModule", { value: !0 });
vt.shouldUseRule = vt.shouldUseGroup = vt.schemaHasRulesForType = void 0;
function Fd({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && nl(e, n);
}
vt.schemaHasRulesForType = Fd;
function nl(e, t) {
  return t.rules.some((r) => sl(e, r));
}
vt.shouldUseGroup = nl;
function sl(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
vt.shouldUseRule = sl;
Object.defineProperty(we, "__esModule", { value: !0 });
we.reportTypeError = we.checkDataTypes = we.checkDataType = we.coerceAndCheckDataType = we.getJSONTypes = we.getSchemaTypes = we.DataType = void 0;
const zd = rr, Ud = vt, qd = rn, te = ee, al = V;
var yr;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(yr || (we.DataType = yr = {}));
function Kd(e) {
  const t = ol(e.type);
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
we.getSchemaTypes = Kd;
function ol(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(zd.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
we.getJSONTypes = ol;
function Gd(e, t) {
  const { gen: r, data: n, opts: s } = e, a = Hd(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, Ud.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const l = ha(t, n, s.strictNumbers, yr.Wrong);
    r.if(l, () => {
      a.length ? Bd(e, t, a) : ma(e);
    });
  }
  return o;
}
we.coerceAndCheckDataType = Gd;
const il = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function Hd(e, t) {
  return t ? e.filter((r) => il.has(r) || t === "array" && r === "array") : [];
}
function Bd(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, te._)`typeof ${s}`), l = n.let("coerced", (0, te._)`undefined`);
  a.coerceTypes === "array" && n.if((0, te._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, te._)`${s}[0]`).assign(o, (0, te._)`typeof ${s}`).if(ha(t, s, a.strictNumbers), () => n.assign(l, s))), n.if((0, te._)`${l} !== undefined`);
  for (const d of r)
    (il.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), ma(e), n.endIf(), n.if((0, te._)`${l} !== undefined`, () => {
    n.assign(s, l), Xd(e, l);
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
function Xd({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, te._)`${t} !== undefined`, () => e.assign((0, te._)`${t}[${r}]`, n));
}
function Gs(e, t, r, n = yr.Correct) {
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
we.checkDataType = Gs;
function ha(e, t, r, n) {
  if (e.length === 1)
    return Gs(e[0], t, r, n);
  let s;
  const a = (0, al.toHash)(e);
  if (a.array && a.object) {
    const o = (0, te._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, te._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = te.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, te.and)(s, Gs(o, t, r, n));
  return s;
}
we.checkDataTypes = ha;
const Jd = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, te._)`{type: ${e}}` : (0, te._)`{type: ${t}}`
};
function ma(e) {
  const t = Wd(e);
  (0, qd.reportError)(t, Jd);
}
we.reportTypeError = ma;
function Wd(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, al.schemaRefOrVal)(e, n, "type");
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
var Qn = {};
Object.defineProperty(Qn, "__esModule", { value: !0 });
Qn.assignDefaults = void 0;
const ir = ee, Yd = V;
function Qd(e, t) {
  const { properties: r, items: n } = e.schema;
  if (t === "object" && r)
    for (const s in r)
      gi(e, s, r[s].default);
  else t === "array" && Array.isArray(n) && n.forEach((s, a) => gi(e, a, s.default));
}
Qn.assignDefaults = Qd;
function gi(e, t, r) {
  const { gen: n, compositeRule: s, data: a, opts: o } = e;
  if (r === void 0)
    return;
  const l = (0, ir._)`${a}${(0, ir.getProperty)(t)}`;
  if (s) {
    (0, Yd.checkStrictMode)(e, `default is ignored for: ${l}`);
    return;
  }
  let c = (0, ir._)`${l} === undefined`;
  o.useDefaults === "empty" && (c = (0, ir._)`${c} || ${l} === null || ${l} === ""`), n.if(c, (0, ir._)`${l} = ${(0, ir.stringify)(r)}`);
}
var ht = {}, ae = {};
Object.defineProperty(ae, "__esModule", { value: !0 });
ae.validateUnion = ae.validateArray = ae.usePattern = ae.callValidateCode = ae.schemaProperties = ae.allSchemaProperties = ae.noPropertyInData = ae.propertyInData = ae.isOwnProperty = ae.hasPropFunc = ae.reportMissingProp = ae.checkMissingProp = ae.checkReportMissingProp = void 0;
const fe = ee, pa = V, Nt = Be, Zd = V;
function xd(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if(ya(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, fe._)`${t}` }, !0), e.error();
  });
}
ae.checkReportMissingProp = xd;
function ef({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, fe.or)(...n.map((a) => (0, fe.and)(ya(e, t, a, r.ownProperties), (0, fe._)`${s} = ${a}`)));
}
ae.checkMissingProp = ef;
function tf(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
ae.reportMissingProp = tf;
function cl(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, fe._)`Object.prototype.hasOwnProperty`
  });
}
ae.hasPropFunc = cl;
function $a(e, t, r) {
  return (0, fe._)`${cl(e)}.call(${t}, ${r})`;
}
ae.isOwnProperty = $a;
function rf(e, t, r, n) {
  const s = (0, fe._)`${t}${(0, fe.getProperty)(r)} !== undefined`;
  return n ? (0, fe._)`${s} && ${$a(e, t, r)}` : s;
}
ae.propertyInData = rf;
function ya(e, t, r, n) {
  const s = (0, fe._)`${t}${(0, fe.getProperty)(r)} === undefined`;
  return n ? (0, fe.or)(s, (0, fe.not)($a(e, t, r))) : s;
}
ae.noPropertyInData = ya;
function ll(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
ae.allSchemaProperties = ll;
function nf(e, t) {
  return ll(t).filter((r) => !(0, pa.alwaysValidSchema)(e, t[r]));
}
ae.schemaProperties = nf;
function sf({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, l, c, d) {
  const u = d ? (0, fe._)`${e}, ${t}, ${n}${s}` : t, h = [
    [Nt.default.instancePath, (0, fe.strConcat)(Nt.default.instancePath, a)],
    [Nt.default.parentData, o.parentData],
    [Nt.default.parentDataProperty, o.parentDataProperty],
    [Nt.default.rootData, Nt.default.rootData]
  ];
  o.opts.dynamicRef && h.push([Nt.default.dynamicAnchors, Nt.default.dynamicAnchors]);
  const w = (0, fe._)`${u}, ${r.object(...h)}`;
  return c !== fe.nil ? (0, fe._)`${l}.call(${c}, ${w})` : (0, fe._)`${l}(${w})`;
}
ae.callValidateCode = sf;
const af = (0, fe._)`new RegExp`;
function of({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, fe._)`${s.code === "new RegExp" ? af : (0, Zd.useFunc)(e, s)}(${r}, ${n})`
  });
}
ae.usePattern = of;
function cf(e) {
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
        dataPropType: pa.Type.Num
      }, a), t.if((0, fe.not)(a), l);
    });
  }
}
ae.validateArray = cf;
function lf(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, pa.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
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
ae.validateUnion = lf;
Object.defineProperty(ht, "__esModule", { value: !0 });
ht.validateKeywordUsage = ht.validSchemaType = ht.funcKeywordCode = ht.macroKeywordCode = void 0;
const Le = ee, Bt = Be, uf = ae, df = rn;
function ff(e, t) {
  const { gen: r, keyword: n, schema: s, parentSchema: a, it: o } = e, l = t.macro.call(o.self, s, a, o), c = ul(r, n, l);
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
ht.macroKeywordCode = ff;
function hf(e, t) {
  var r;
  const { gen: n, keyword: s, schema: a, parentSchema: o, $data: l, it: c } = e;
  pf(c, t);
  const d = !l && t.compile ? t.compile.call(c.self, a, o, c) : t.validate, u = ul(n, s, d), h = n.let("valid");
  e.block$data(h, w), e.ok((r = t.valid) !== null && r !== void 0 ? r : h);
  function w() {
    if (t.errors === !1)
      _(), t.modifying && _i(e), g(() => e.error());
    else {
      const m = t.async ? y() : v();
      t.modifying && _i(e), g(() => mf(e, m));
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
    const E = c.opts.passContext ? Bt.default.this : Bt.default.self, R = !("compile" in t && !l || t.schema === !1);
    n.assign(h, (0, Le._)`${m}${(0, uf.callValidateCode)(e, u, E, R)}`, t.modifying);
  }
  function g(m) {
    var E;
    n.if((0, Le.not)((E = t.valid) !== null && E !== void 0 ? E : h), m);
  }
}
ht.funcKeywordCode = hf;
function _i(e) {
  const { gen: t, data: r, it: n } = e;
  t.if(n.parentData, () => t.assign(r, (0, Le._)`${n.parentData}[${n.parentDataProperty}]`));
}
function mf(e, t) {
  const { gen: r } = e;
  r.if((0, Le._)`Array.isArray(${t})`, () => {
    r.assign(Bt.default.vErrors, (0, Le._)`${Bt.default.vErrors} === null ? ${t} : ${Bt.default.vErrors}.concat(${t})`).assign(Bt.default.errors, (0, Le._)`${Bt.default.vErrors}.length`), (0, df.extendErrors)(e);
  }, () => e.error());
}
function pf({ schemaEnv: e }, t) {
  if (t.async && !e.$async)
    throw new Error("async keyword in sync schema");
}
function ul(e, t, r) {
  if (r === void 0)
    throw new Error(`keyword "${t}" failed to compile`);
  return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, Le.stringify)(r) });
}
function $f(e, t, r = !1) {
  return !t.length || t.some((n) => n === "array" ? Array.isArray(e) : n === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == n || r && typeof e > "u");
}
ht.validSchemaType = $f;
function yf({ schema: e, opts: t, self: r, errSchemaPath: n }, s, a) {
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
ht.validateKeywordUsage = yf;
var Lt = {};
Object.defineProperty(Lt, "__esModule", { value: !0 });
Lt.extendSubschemaMode = Lt.extendSubschemaData = Lt.getSubschema = void 0;
const dt = ee, dl = V;
function gf(e, { keyword: t, schemaProp: r, schema: n, schemaPath: s, errSchemaPath: a, topSchemaRef: o }) {
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
      errSchemaPath: `${e.errSchemaPath}/${t}/${(0, dl.escapeFragment)(r)}`
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
Lt.getSubschema = gf;
function _f(e, t, { dataProp: r, dataPropType: n, data: s, dataTypes: a, propertyName: o }) {
  if (s !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: l } = t;
  if (r !== void 0) {
    const { errorPath: d, dataPathArr: u, opts: h } = t, w = l.let("data", (0, dt._)`${t.data}${(0, dt.getProperty)(r)}`, !0);
    c(w), e.errorPath = (0, dt.str)`${d}${(0, dl.getErrorPath)(r, n, h.jsPropertySyntax)}`, e.parentDataProperty = (0, dt._)`${r}`, e.dataPathArr = [...u, e.parentDataProperty];
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
Lt.extendSubschemaData = _f;
function vf(e, { jtdDiscriminator: t, jtdMetadata: r, compositeRule: n, createErrors: s, allErrors: a }) {
  n !== void 0 && (e.compositeRule = n), s !== void 0 && (e.createErrors = s), a !== void 0 && (e.allErrors = a), e.jtdDiscriminator = t, e.jtdMetadata = r;
}
Lt.extendSubschemaMode = vf;
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
}, fl = { exports: {} }, Mt = fl.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  jn(t, n, s, e, "", e);
};
Mt.keywords = {
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
Mt.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Mt.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Mt.skipKeywords = {
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
function jn(e, t, r, n, s, a, o, l, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, l, c, d);
    for (var u in n) {
      var h = n[u];
      if (Array.isArray(h)) {
        if (u in Mt.arrayKeywords)
          for (var w = 0; w < h.length; w++)
            jn(e, t, r, h[w], s + "/" + u + "/" + w, a, s, u, n, w);
      } else if (u in Mt.propsKeywords) {
        if (h && typeof h == "object")
          for (var y in h)
            jn(e, t, r, h[y], s + "/" + u + "/" + wf(y), a, s, u, n, y);
      } else (u in Mt.keywords || e.allKeys && !(u in Mt.skipKeywords)) && jn(e, t, r, h, s + "/" + u, a, s, u, n);
    }
    r(n, s, a, o, l, c, d);
  }
}
function wf(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var Ef = fl.exports;
Object.defineProperty(Oe, "__esModule", { value: !0 });
Oe.getSchemaRefs = Oe.resolveUrl = Oe.normalizeId = Oe._getFullPath = Oe.getFullPath = Oe.inlineRef = void 0;
const bf = V, Sf = Zn, Pf = Ef, Nf = /* @__PURE__ */ new Set([
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
function Rf(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !Hs(e) : t ? hl(e) <= t : !1;
}
Oe.inlineRef = Rf;
const Of = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function Hs(e) {
  for (const t in e) {
    if (Of.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(Hs) || typeof r == "object" && Hs(r))
      return !0;
  }
  return !1;
}
function hl(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !Nf.has(r) && (typeof e[r] == "object" && (0, bf.eachItem)(e[r], (n) => t += hl(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function ml(e, t = "", r) {
  r !== !1 && (t = gr(t));
  const n = e.parse(t);
  return pl(e, n);
}
Oe.getFullPath = ml;
function pl(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
Oe._getFullPath = pl;
const If = /#\/?$/;
function gr(e) {
  return e ? e.replace(If, "") : "";
}
Oe.normalizeId = gr;
function Tf(e, t, r) {
  return r = gr(r), e.resolve(t, r);
}
Oe.resolveUrl = Tf;
const jf = /^[a-z_][-a-z0-9._]*$/i;
function Af(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = gr(e[r] || t), a = { "": s }, o = ml(n, s, !1), l = {}, c = /* @__PURE__ */ new Set();
  return Pf(e, { allKeys: !0 }, (h, w, y, v) => {
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
        if (!jf.test(R))
          throw new Error(`invalid anchor "${R}"`);
        m.call(this, `#${R}`);
      }
    }
  }), l;
  function d(h, w, y) {
    if (w !== void 0 && !Sf(h, w))
      throw u(y);
  }
  function u(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
Oe.getSchemaRefs = Af;
Object.defineProperty(at, "__esModule", { value: !0 });
at.getData = at.KeywordCxt = at.validateFunctionCode = void 0;
const $l = Er, vi = we, ga = vt, qn = we, kf = Qn, Hr = ht, vs = Lt, B = ee, Y = Be, Cf = Oe, wt = V, Lr = rn;
function Df(e) {
  if (_l(e) && (vl(e), gl(e))) {
    Lf(e);
    return;
  }
  yl(e, () => (0, $l.topBoolOrEmptySchema)(e));
}
at.validateFunctionCode = Df;
function yl({ gen: e, validateName: t, schema: r, schemaEnv: n, opts: s }, a) {
  s.code.es5 ? e.func(t, (0, B._)`${Y.default.data}, ${Y.default.valCxt}`, n.$async, () => {
    e.code((0, B._)`"use strict"; ${wi(r, s)}`), Vf(e, s), e.code(a);
  }) : e.func(t, (0, B._)`${Y.default.data}, ${Mf(s)}`, n.$async, () => e.code(wi(r, s)).code(a));
}
function Mf(e) {
  return (0, B._)`{${Y.default.instancePath}="", ${Y.default.parentData}, ${Y.default.parentDataProperty}, ${Y.default.rootData}=${Y.default.data}${e.dynamicRef ? (0, B._)`, ${Y.default.dynamicAnchors}={}` : B.nil}}={}`;
}
function Vf(e, t) {
  e.if(Y.default.valCxt, () => {
    e.var(Y.default.instancePath, (0, B._)`${Y.default.valCxt}.${Y.default.instancePath}`), e.var(Y.default.parentData, (0, B._)`${Y.default.valCxt}.${Y.default.parentData}`), e.var(Y.default.parentDataProperty, (0, B._)`${Y.default.valCxt}.${Y.default.parentDataProperty}`), e.var(Y.default.rootData, (0, B._)`${Y.default.valCxt}.${Y.default.rootData}`), t.dynamicRef && e.var(Y.default.dynamicAnchors, (0, B._)`${Y.default.valCxt}.${Y.default.dynamicAnchors}`);
  }, () => {
    e.var(Y.default.instancePath, (0, B._)`""`), e.var(Y.default.parentData, (0, B._)`undefined`), e.var(Y.default.parentDataProperty, (0, B._)`undefined`), e.var(Y.default.rootData, Y.default.data), t.dynamicRef && e.var(Y.default.dynamicAnchors, (0, B._)`{}`);
  });
}
function Lf(e) {
  const { schema: t, opts: r, gen: n } = e;
  yl(e, () => {
    r.$comment && t.$comment && El(e), Kf(e), n.let(Y.default.vErrors, null), n.let(Y.default.errors, 0), r.unevaluated && Ff(e), wl(e), Bf(e);
  });
}
function Ff(e) {
  const { gen: t, validateName: r } = e;
  e.evaluated = t.const("evaluated", (0, B._)`${r}.evaluated`), t.if((0, B._)`${e.evaluated}.dynamicProps`, () => t.assign((0, B._)`${e.evaluated}.props`, (0, B._)`undefined`)), t.if((0, B._)`${e.evaluated}.dynamicItems`, () => t.assign((0, B._)`${e.evaluated}.items`, (0, B._)`undefined`));
}
function wi(e, t) {
  const r = typeof e == "object" && e[t.schemaId];
  return r && (t.code.source || t.code.process) ? (0, B._)`/*# sourceURL=${r} */` : B.nil;
}
function zf(e, t) {
  if (_l(e) && (vl(e), gl(e))) {
    Uf(e, t);
    return;
  }
  (0, $l.boolOrEmptySchema)(e, t);
}
function gl({ schema: e, self: t }) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t.RULES.all[r])
      return !0;
  return !1;
}
function _l(e) {
  return typeof e.schema != "boolean";
}
function Uf(e, t) {
  const { schema: r, gen: n, opts: s } = e;
  s.$comment && r.$comment && El(e), Gf(e), Hf(e);
  const a = n.const("_errs", Y.default.errors);
  wl(e, a), n.var(t, (0, B._)`${a} === ${Y.default.errors}`);
}
function vl(e) {
  (0, wt.checkUnknownRules)(e), qf(e);
}
function wl(e, t) {
  if (e.opts.jtd)
    return Ei(e, [], !1, t);
  const r = (0, vi.getSchemaTypes)(e.schema), n = (0, vi.coerceAndCheckDataType)(e, r);
  Ei(e, r, !n, t);
}
function qf(e) {
  const { schema: t, errSchemaPath: r, opts: n, self: s } = e;
  t.$ref && n.ignoreKeywordsWithRef && (0, wt.schemaHasRulesButRef)(t, s.RULES) && s.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function Kf(e) {
  const { schema: t, opts: r } = e;
  t.default !== void 0 && r.useDefaults && r.strictSchema && (0, wt.checkStrictMode)(e, "default is ignored in the schema root");
}
function Gf(e) {
  const t = e.schema[e.opts.schemaId];
  t && (e.baseId = (0, Cf.resolveUrl)(e.opts.uriResolver, e.baseId, t));
}
function Hf(e) {
  if (e.schema.$async && !e.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function El({ gen: e, schemaEnv: t, schema: r, errSchemaPath: n, opts: s }) {
  const a = r.$comment;
  if (s.$comment === !0)
    e.code((0, B._)`${Y.default.self}.logger.log(${a})`);
  else if (typeof s.$comment == "function") {
    const o = (0, B.str)`${n}/$comment`, l = e.scopeValue("root", { ref: t.root });
    e.code((0, B._)`${Y.default.self}.opts.$comment(${a}, ${o}, ${l}.schema)`);
  }
}
function Bf(e) {
  const { gen: t, schemaEnv: r, validateName: n, ValidationError: s, opts: a } = e;
  r.$async ? t.if((0, B._)`${Y.default.errors} === 0`, () => t.return(Y.default.data), () => t.throw((0, B._)`new ${s}(${Y.default.vErrors})`)) : (t.assign((0, B._)`${n}.errors`, Y.default.vErrors), a.unevaluated && Xf(e), t.return((0, B._)`${Y.default.errors} === 0`));
}
function Xf({ gen: e, evaluated: t, props: r, items: n }) {
  r instanceof B.Name && e.assign((0, B._)`${t}.props`, r), n instanceof B.Name && e.assign((0, B._)`${t}.items`, n);
}
function Ei(e, t, r, n) {
  const { gen: s, schema: a, data: o, allErrors: l, opts: c, self: d } = e, { RULES: u } = d;
  if (a.$ref && (c.ignoreKeywordsWithRef || !(0, wt.schemaHasRulesButRef)(a, u))) {
    s.block(() => Pl(e, "$ref", u.all.$ref.definition));
    return;
  }
  c.jtd || Jf(e, t), s.block(() => {
    for (const w of u.rules)
      h(w);
    h(u.post);
  });
  function h(w) {
    (0, ga.shouldUseGroup)(a, w) && (w.type ? (s.if((0, qn.checkDataType)(w.type, o, c.strictNumbers)), bi(e, w), t.length === 1 && t[0] === w.type && r && (s.else(), (0, qn.reportTypeError)(e)), s.endIf()) : bi(e, w), l || s.if((0, B._)`${Y.default.errors} === ${n || 0}`));
  }
}
function bi(e, t) {
  const { gen: r, schema: n, opts: { useDefaults: s } } = e;
  s && (0, kf.assignDefaults)(e, t.type), r.block(() => {
    for (const a of t.rules)
      (0, ga.shouldUseRule)(n, a) && Pl(e, a.keyword, a.definition, t.type);
  });
}
function Jf(e, t) {
  e.schemaEnv.meta || !e.opts.strictTypes || (Wf(e, t), e.opts.allowUnionTypes || Yf(e, t), Qf(e, e.dataTypes));
}
function Wf(e, t) {
  if (t.length) {
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    t.forEach((r) => {
      bl(e.dataTypes, r) || _a(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }), xf(e, t);
  }
}
function Yf(e, t) {
  t.length > 1 && !(t.length === 2 && t.includes("null")) && _a(e, "use allowUnionTypes to allow union type keyword");
}
function Qf(e, t) {
  const r = e.self.RULES.all;
  for (const n in r) {
    const s = r[n];
    if (typeof s == "object" && (0, ga.shouldUseRule)(e.schema, s)) {
      const { type: a } = s.definition;
      a.length && !a.some((o) => Zf(t, o)) && _a(e, `missing type "${a.join(",")}" for keyword "${n}"`);
    }
  }
}
function Zf(e, t) {
  return e.includes(t) || t === "number" && e.includes("integer");
}
function bl(e, t) {
  return e.includes(t) || t === "integer" && e.includes("number");
}
function xf(e, t) {
  const r = [];
  for (const n of e.dataTypes)
    bl(t, n) ? r.push(n) : t.includes("integer") && n === "number" && r.push("integer");
  e.dataTypes = r;
}
function _a(e, t) {
  const r = e.schemaEnv.baseId + e.errSchemaPath;
  t += ` at "${r}" (strictTypes)`, (0, wt.checkStrictMode)(e, t, e.opts.strictTypes);
}
class Sl {
  constructor(t, r, n) {
    if ((0, Hr.validateKeywordUsage)(t, r, n), this.gen = t.gen, this.allErrors = t.allErrors, this.keyword = n, this.data = t.data, this.schema = t.schema[n], this.$data = r.$data && t.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, wt.schemaRefOrVal)(t, this.schema, n, this.$data), this.schemaType = r.schemaType, this.parentSchema = t.schema, this.params = {}, this.it = t, this.def = r, this.$data)
      this.schemaCode = t.gen.const("vSchema", Nl(this.$data, t));
    else if (this.schemaCode = this.schemaValue, !(0, Hr.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
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
    (t ? Lr.reportExtraError : Lr.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, Lr.reportError)(this, this.def.$dataError || Lr.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, Lr.resetErrorsCount)(this.gen, this.errsCount);
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
        return (0, B._)`${(0, qn.checkDataTypes)(c, r, a.opts.strictNumbers, qn.DataType.Wrong)}`;
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
    const n = (0, vs.getSubschema)(this.it, t);
    (0, vs.extendSubschemaData)(n, this.it, t), (0, vs.extendSubschemaMode)(n, t);
    const s = { ...this.it, ...n, items: void 0, props: void 0 };
    return zf(s, r), s;
  }
  mergeEvaluated(t, r) {
    const { it: n, gen: s } = this;
    n.opts.unevaluated && (n.props !== !0 && t.props !== void 0 && (n.props = wt.mergeEvaluated.props(s, t.props, n.props, r)), n.items !== !0 && t.items !== void 0 && (n.items = wt.mergeEvaluated.items(s, t.items, n.items, r)));
  }
  mergeValidEvaluated(t, r) {
    const { it: n, gen: s } = this;
    if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0))
      return s.if(r, () => this.mergeEvaluated(t, B.Name)), !0;
  }
}
at.KeywordCxt = Sl;
function Pl(e, t, r, n) {
  const s = new Sl(e, r, t);
  "code" in r ? r.code(s, n) : s.$data && r.validate ? (0, Hr.funcKeywordCode)(s, r) : "macro" in r ? (0, Hr.macroKeywordCode)(s, r) : (r.compile || r.validate) && (0, Hr.funcKeywordCode)(s, r);
}
const eh = /^\/(?:[^~]|~0|~1)*$/, th = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function Nl(e, { dataLevel: t, dataNames: r, dataPathArr: n }) {
  let s, a;
  if (e === "")
    return Y.default.rootData;
  if (e[0] === "/") {
    if (!eh.test(e))
      throw new Error(`Invalid JSON-pointer: ${e}`);
    s = e, a = Y.default.rootData;
  } else {
    const d = th.exec(e);
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
    d && (a = (0, B._)`${a}${(0, B.getProperty)((0, wt.unescapeJsonPointer)(d))}`, o = (0, B._)`${o} && ${a}`);
  return o;
  function c(d, u) {
    return `Cannot access ${d} ${u} levels up, current level is ${t}`;
  }
}
at.getData = Nl;
var nn = {};
Object.defineProperty(nn, "__esModule", { value: !0 });
class rh extends Error {
  constructor(t) {
    super("validation failed"), this.errors = t, this.ajv = this.validation = !0;
  }
}
nn.default = rh;
var Nr = {};
Object.defineProperty(Nr, "__esModule", { value: !0 });
const ws = Oe;
let nh = class extends Error {
  constructor(t, r, n, s) {
    super(s || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, ws.resolveUrl)(t, r, n), this.missingSchema = (0, ws.normalizeId)((0, ws.getFullPath)(t, this.missingRef));
  }
};
Nr.default = nh;
var Fe = {};
Object.defineProperty(Fe, "__esModule", { value: !0 });
Fe.resolveSchema = Fe.getCompilingSchema = Fe.resolveRef = Fe.compileSchema = Fe.SchemaEnv = void 0;
const Ze = ee, sh = nn, Kt = Be, nt = Oe, Si = V, ah = at;
let xn = class {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, nt.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
};
Fe.SchemaEnv = xn;
function va(e) {
  const t = Rl.call(this, e);
  if (t)
    return t;
  const r = (0, nt.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new Ze.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let l;
  e.$async && (l = o.scopeValue("Error", {
    ref: sh.default,
    code: (0, Ze._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const c = o.scopeName("validate");
  e.validateName = c;
  const d = {
    gen: o,
    allErrors: this.opts.allErrors,
    data: Kt.default.data,
    parentData: Kt.default.parentData,
    parentDataProperty: Kt.default.parentDataProperty,
    dataNames: [Kt.default.data],
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
    this._compilations.add(e), (0, ah.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    u = `${o.scopeRefs(Kt.default.scope)}return ${h}`, this.opts.code.process && (u = this.opts.code.process(u, e));
    const y = new Function(`${Kt.default.self}`, `${Kt.default.scope}`, u)(this, this.scope.get());
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
Fe.compileSchema = va;
function oh(e, t, r) {
  var n;
  r = (0, nt.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = lh.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: l } = this.opts;
    o && (a = new xn({ schema: o, schemaId: l, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = ih.call(this, a);
}
Fe.resolveRef = oh;
function ih(e) {
  return (0, nt.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : va.call(this, e);
}
function Rl(e) {
  for (const t of this._compilations)
    if (ch(t, e))
      return t;
}
Fe.getCompilingSchema = Rl;
function ch(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function lh(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || es.call(this, e, t);
}
function es(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, nt._getFullPath)(this.opts.uriResolver, r);
  let s = (0, nt.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return Es.call(this, r, e);
  const a = (0, nt.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const l = es.call(this, e, o);
    return typeof (l == null ? void 0 : l.schema) != "object" ? void 0 : Es.call(this, r, l);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || va.call(this, o), a === (0, nt.normalizeId)(t)) {
      const { schema: l } = o, { schemaId: c } = this.opts, d = l[c];
      return d && (s = (0, nt.resolveUrl)(this.opts.uriResolver, s, d)), new xn({ schema: l, schemaId: c, root: e, baseId: s });
    }
    return Es.call(this, r, o);
  }
}
Fe.resolveSchema = es;
const uh = /* @__PURE__ */ new Set([
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
    const c = r[(0, Si.unescapeFragment)(l)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !uh.has(l) && d && (t = (0, nt.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, Si.schemaHasRulesButRef)(r, this.RULES)) {
    const l = (0, nt.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = es.call(this, n, l);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new xn({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const dh = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", fh = "Meta-schema for $data reference (JSON AnySchema extension proposal)", hh = "object", mh = [
  "$data"
], ph = {
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
}, $h = !1, yh = {
  $id: dh,
  description: fh,
  type: hh,
  required: mh,
  properties: ph,
  additionalProperties: $h
};
var wa = {}, ts = { exports: {} };
const gh = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu), Ol = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u), Ea = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu), Il = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu), _h = RegExp.prototype.test.bind(/^[\da-z\-._~!$&'()*+,;=:@/]$/iu);
function Tl(e) {
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
const vh = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
function Pi(e) {
  return e.length = 0, !0;
}
function wh(e, t, r) {
  if (e.length) {
    const n = Tl(e);
    if (n !== "")
      t.push(n);
    else
      return r.error = !0, !1;
    e.length = 0;
  }
  return !0;
}
function Eh(e) {
  let t = 0;
  const r = { error: !1, address: "", zone: "" }, n = [], s = [];
  let a = !1, o = !1, l = wh;
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
        l = Pi;
      } else {
        s.push(d);
        continue;
      }
  }
  return s.length && (l === Pi ? r.zone = s.join("") : o ? n.push(s.join("")) : n.push(Tl(s))), r.address = n.join(""), r;
}
function jl(e) {
  if (bh(e, ":") < 2)
    return { host: e, isIPV6: !1 };
  const t = Eh(e);
  if (t.error)
    return { host: e, isIPV6: !1 };
  {
    let r = t.address, n = t.address;
    return t.zone && (r += "%" + t.zone, n += "%25" + t.zone), { host: r, isIPV6: !0, escapedHost: n };
  }
}
function bh(e, t) {
  let r = 0;
  for (let n = 0; n < e.length; n++)
    e[n] === t && r++;
  return r;
}
function Sh(e) {
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
const Ph = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" }, Nh = /[@/?#:]/g, Rh = /[@/?#]/g;
function Al(e, t) {
  const r = t ? Rh : Nh;
  return r.lastIndex = 0, e.replace(r, (n) => Ph[n]);
}
function Oh(e, t = !1) {
  if (e.indexOf("%") === -1)
    return e;
  let r = "";
  for (let n = 0; n < e.length; n++) {
    if (e[n] === "%" && n + 2 < e.length) {
      const s = e.slice(n + 1, n + 3);
      if (Ea(s)) {
        const a = s.toUpperCase(), o = String.fromCharCode(parseInt(a, 16));
        t && Il(o) ? r += o : r += "%" + a, n += 2;
        continue;
      }
    }
    r += e[n];
  }
  return r;
}
function Ih(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (Ea(n)) {
        const s = n.toUpperCase(), a = String.fromCharCode(parseInt(s, 16));
        a !== "." && Il(a) ? t += a : t += "%" + s, r += 2;
        continue;
      }
    }
    _h(e[r]) ? t += e[r] : t += escape(e[r]);
  }
  return t;
}
function Th(e) {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e[r] === "%" && r + 2 < e.length) {
      const n = e.slice(r + 1, r + 3);
      if (Ea(n)) {
        t += "%" + n.toUpperCase(), r += 2;
        continue;
      }
    }
    t += escape(e[r]);
  }
  return t;
}
function jh(e) {
  const t = [];
  if (e.userinfo !== void 0 && (t.push(e.userinfo), t.push("@")), e.host !== void 0) {
    let r = unescape(e.host);
    if (!Ol(r)) {
      const n = jl(r);
      n.isIPV6 === !0 ? r = `[${n.escapedHost}]` : r = Al(r, !1);
    }
    t.push(r);
  }
  return (typeof e.port == "number" || typeof e.port == "string") && (t.push(":"), t.push(String(e.port))), t.length ? t.join("") : void 0;
}
var kl = {
  nonSimpleDomain: vh,
  recomposeAuthority: jh,
  reescapeHostDelimiters: Al,
  normalizePercentEncoding: Oh,
  normalizePathEncoding: Ih,
  escapePreservingEscapes: Th,
  removeDotSegments: Sh,
  isIPv4: Ol,
  isUUID: gh,
  normalizeIPv6: jl
};
const { isUUID: Ah } = kl, kh = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
function Cl(e) {
  return e.secure === !0 ? !0 : e.secure === !1 ? !1 : e.scheme ? e.scheme.length === 3 && (e.scheme[0] === "w" || e.scheme[0] === "W") && (e.scheme[1] === "s" || e.scheme[1] === "S") && (e.scheme[2] === "s" || e.scheme[2] === "S") : !1;
}
function Dl(e) {
  return e.host || (e.error = e.error || "HTTP URIs must have a host."), e;
}
function Ml(e) {
  const t = String(e.scheme).toLowerCase() === "https";
  return (e.port === (t ? 443 : 80) || e.port === "") && (e.port = void 0), e.path || (e.path = "/"), e;
}
function Ch(e) {
  return e.secure = Cl(e), e.resourceName = (e.path || "/") + (e.query ? "?" + e.query : ""), e.path = void 0, e.query = void 0, e;
}
function Dh(e) {
  if ((e.port === (Cl(e) ? 443 : 80) || e.port === "") && (e.port = void 0), typeof e.secure == "boolean" && (e.scheme = e.secure ? "wss" : "ws", e.secure = void 0), e.resourceName) {
    const [t, r] = e.resourceName.split("?");
    e.path = t && t !== "/" ? t : void 0, e.query = r, e.resourceName = void 0;
  }
  return e.fragment = void 0, e;
}
function Mh(e, t) {
  if (!e.path)
    return e.error = "URN can not be parsed", e;
  const r = e.path.match(kh);
  if (r) {
    const n = t.scheme || e.scheme || "urn";
    e.nid = r[1].toLowerCase(), e.nss = r[2];
    const s = `${n}:${t.nid || e.nid}`, a = ba(s);
    e.path = void 0, a && (e = a.parse(e, t));
  } else
    e.error = e.error || "URN can not be parsed.";
  return e;
}
function Vh(e, t) {
  if (e.nid === void 0)
    throw new Error("URN without nid cannot be serialized");
  const r = t.scheme || e.scheme || "urn", n = e.nid.toLowerCase(), s = `${r}:${t.nid || n}`, a = ba(s);
  a && (e = a.serialize(e, t));
  const o = e, l = e.nss;
  return o.path = `${n || t.nid}:${l}`, t.skipEscape = !0, o;
}
function Lh(e, t) {
  const r = e;
  return r.uuid = r.nss, r.nss = void 0, !t.tolerant && (!r.uuid || !Ah(r.uuid)) && (r.error = r.error || "UUID is not valid."), r;
}
function Fh(e) {
  const t = e;
  return t.nss = (e.uuid || "").toLowerCase(), t;
}
const Vl = (
  /** @type {SchemeHandler} */
  {
    scheme: "http",
    domainHost: !0,
    parse: Dl,
    serialize: Ml
  }
), zh = (
  /** @type {SchemeHandler} */
  {
    scheme: "https",
    domainHost: Vl.domainHost,
    parse: Dl,
    serialize: Ml
  }
), An = (
  /** @type {SchemeHandler} */
  {
    scheme: "ws",
    domainHost: !0,
    parse: Ch,
    serialize: Dh
  }
), Uh = (
  /** @type {SchemeHandler} */
  {
    scheme: "wss",
    domainHost: An.domainHost,
    parse: An.parse,
    serialize: An.serialize
  }
), qh = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn",
    parse: Mh,
    serialize: Vh,
    skipNormalize: !0
  }
), Kh = (
  /** @type {SchemeHandler} */
  {
    scheme: "urn:uuid",
    parse: Lh,
    serialize: Fh,
    skipNormalize: !0
  }
), Kn = (
  /** @type {Record<SchemeName, SchemeHandler>} */
  {
    http: Vl,
    https: zh,
    ws: An,
    wss: Uh,
    urn: qh,
    "urn:uuid": Kh
  }
);
Object.setPrototypeOf(Kn, null);
function ba(e) {
  return e && (Kn[
    /** @type {SchemeName} */
    e
  ] || Kn[
    /** @type {SchemeName} */
    e.toLowerCase()
  ]) || void 0;
}
var Gh = {
  SCHEMES: Kn,
  getSchemeHandler: ba
};
const { normalizeIPv6: Hh, removeDotSegments: qr, recomposeAuthority: Bh, normalizePercentEncoding: Xh, normalizePathEncoding: Jh, escapePreservingEscapes: Wh, reescapeHostDelimiters: Yh, isIPv4: Qh, nonSimpleDomain: Zh } = kl, { SCHEMES: xh, getSchemeHandler: Ll } = Gh;
function em(e, t) {
  return typeof e == "string" ? e = /** @type {T} */
  am(e, t) : typeof e == "object" && (e = /** @type {T} */
  br(nr(e, t), t)), e;
}
function tm(e, t, r) {
  const n = r ? Object.assign({ scheme: "null" }, r) : { scheme: "null" }, s = Fl(br(e, n), br(t, n), n, !0);
  return n.skipEscape = !0, nr(s, n);
}
function Fl(e, t, r, n) {
  const s = {};
  return n || (e = br(nr(e, r), r), t = br(nr(t, r), r)), r = r || {}, !r.tolerant && t.scheme ? (s.scheme = t.scheme, s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = qr(t.path || ""), s.query = t.query) : (t.userinfo !== void 0 || t.host !== void 0 || t.port !== void 0 ? (s.userinfo = t.userinfo, s.host = t.host, s.port = t.port, s.path = qr(t.path || ""), s.query = t.query) : (t.path ? (t.path[0] === "/" ? s.path = qr(t.path) : ((e.userinfo !== void 0 || e.host !== void 0 || e.port !== void 0) && !e.path ? s.path = "/" + t.path : e.path ? s.path = e.path.slice(0, e.path.lastIndexOf("/") + 1) + t.path : s.path = t.path, s.path = qr(s.path)), s.query = t.query) : (s.path = e.path, t.query !== void 0 ? s.query = t.query : s.query = e.query), s.userinfo = e.userinfo, s.host = e.host, s.port = e.port), s.scheme = e.scheme), s.fragment = t.fragment, s;
}
function rm(e, t, r) {
  const n = Ni(e, r), s = Ni(t, r);
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
  }, n = Object.assign({}, t), s = [], a = Ll(n.scheme || r.scheme);
  a && a.serialize && a.serialize(r, n), r.path !== void 0 && (n.skipEscape ? r.path = Xh(r.path) : (r.path = Wh(r.path), r.scheme !== void 0 && (r.path = r.path.split("%3A").join(":")))), n.reference !== "suffix" && r.scheme && s.push(r.scheme, ":");
  const o = Bh(r);
  if (o !== void 0 && (n.reference !== "suffix" && s.push("//"), s.push(o), r.path && r.path[0] !== "/" && s.push("/")), r.path !== void 0) {
    let l = r.path;
    !n.absolutePath && (!a || !a.absolutePath) && (l = qr(l)), o === void 0 && l[0] === "/" && l[1] === "/" && (l = "/%2F" + l.slice(2)), s.push(l);
  }
  return r.query !== void 0 && s.push("?", r.query), r.fragment !== void 0 && s.push("#", r.fragment), s.join("");
}
const nm = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
function sm(e, t) {
  if (t[2] !== void 0 && e.path && e.path[0] !== "/")
    return 'URI path must start with "/" when authority is present.';
  if (typeof e.port == "number" && (e.port < 0 || e.port > 65535))
    return "URI port is malformed.";
}
function zl(e, t) {
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
  const o = e.match(nm);
  if (o) {
    n.scheme = o[1], n.userinfo = o[3], n.host = o[4], n.port = parseInt(o[5], 10), n.path = o[6] || "", n.query = o[7], n.fragment = o[8], isNaN(n.port) && (n.port = o[5]);
    const l = sm(n, o);
    if (l !== void 0 && (n.error = n.error || l, s = !0), n.host)
      if (Qh(n.host) === !1) {
        const u = Hh(n.host);
        n.host = u.host.toLowerCase(), a = u.isIPV6;
      } else
        a = !0;
    n.scheme === void 0 && n.userinfo === void 0 && n.host === void 0 && n.port === void 0 && n.query === void 0 && !n.path ? n.reference = "same-document" : n.scheme === void 0 ? n.reference = "relative" : n.fragment === void 0 ? n.reference = "absolute" : n.reference = "uri", r.reference && r.reference !== "suffix" && r.reference !== n.reference && (n.error = n.error || "URI is not a " + r.reference + " reference.");
    const c = Ll(r.scheme || n.scheme);
    if (!r.unicodeSupport && (!c || !c.unicodeSupport) && n.host && (r.domainHost || c && c.domainHost) && a === !1 && Zh(n.host))
      try {
        n.host = new URL("http://" + n.host).hostname;
      } catch (d) {
        n.error = n.error || "Host's domain name can not be converted to ASCII: " + d;
      }
    if ((!c || c && !c.skipNormalize) && (e.indexOf("%") !== -1 && (n.scheme !== void 0 && (n.scheme = unescape(n.scheme)), n.host !== void 0 && (n.host = Yh(unescape(n.host), a))), n.path && (n.path = Jh(n.path)), n.fragment))
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
function br(e, t) {
  return zl(e, t).parsed;
}
function am(e, t) {
  return Ul(e, t).normalized;
}
function Ul(e, t) {
  const { parsed: r, malformedAuthorityOrPort: n } = zl(e, t);
  return {
    normalized: n ? e : nr(r, t),
    malformedAuthorityOrPort: n
  };
}
function Ni(e, t) {
  if (typeof e == "string") {
    const { normalized: r, malformedAuthorityOrPort: n } = Ul(e, t);
    return n ? void 0 : r;
  }
  if (typeof e == "object")
    return nr(e, t);
}
const Sa = {
  SCHEMES: xh,
  normalize: em,
  resolve: tm,
  resolveComponent: Fl,
  equal: rm,
  serialize: nr,
  parse: br
};
ts.exports = Sa;
ts.exports.default = Sa;
ts.exports.fastUri = Sa;
var ql = ts.exports;
Object.defineProperty(wa, "__esModule", { value: !0 });
const Kl = ql;
Kl.code = 'require("ajv/dist/runtime/uri").default';
wa.default = Kl;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = at;
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
  const n = nn, s = Nr, a = rr, o = Fe, l = ee, c = Oe, d = we, u = V, h = yh, w = wa, y = (P, p) => new RegExp(P, p);
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
    const Ye = P.strict, qt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, Cr = qt === !0 || qt === void 0 ? 1 : qt || 0, Dr = ($ = (S = P.code) === null || S === void 0 ? void 0 : S.regExp) !== null && $ !== void 0 ? $ : y, ps = (i = P.uriResolver) !== null && i !== void 0 ? i : w.default;
    return {
      strictSchema: (b = (f = P.strictSchema) !== null && f !== void 0 ? f : Ye) !== null && b !== void 0 ? b : !0,
      strictNumbers: (A = (j = P.strictNumbers) !== null && j !== void 0 ? j : Ye) !== null && A !== void 0 ? A : !0,
      strictTypes: (U = (F = P.strictTypes) !== null && F !== void 0 ? F : Ye) !== null && U !== void 0 ? U : "log",
      strictTuples: (I = (N = P.strictTuples) !== null && N !== void 0 ? N : Ye) !== null && I !== void 0 ? I : "log",
      strictRequired: (D = (k = P.strictRequired) !== null && k !== void 0 ? k : Ye) !== null && D !== void 0 ? D : !1,
      code: P.code ? { ...P.code, optimize: Cr, regExp: Dr } : { optimize: Cr, regExp: Dr },
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
      uriResolver: ps
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
})(Yc);
var Pa = {}, Na = {}, Ra = {};
Object.defineProperty(Ra, "__esModule", { value: !0 });
const om = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
Ra.default = om;
var Et = {};
Object.defineProperty(Et, "__esModule", { value: !0 });
Et.callRef = Et.getValidate = void 0;
const im = Nr, Ri = ae, qe = ee, cr = Be, Oi = Fe, dn = V, cm = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: l, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const u = Oi.resolveRef.call(c, d, s, r);
    if (u === void 0)
      throw new im.default(n.opts.uriResolver, s, r);
    if (u instanceof Oi.SchemaEnv)
      return w(u);
    return y(u);
    function h() {
      if (a === d)
        return kn(e, o, a, a.$async);
      const v = t.scopeValue("root", { ref: d });
      return kn(e, (0, qe._)`${v}.validate`, d, d.$async);
    }
    function w(v) {
      const _ = Gl(e, v);
      kn(e, _, v, v.$async);
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
function Gl(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, qe._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
Et.getValidate = Gl;
function kn(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: l, opts: c } = a, d = c.passContext ? cr.default.this : qe.nil;
  n ? u() : h();
  function u() {
    if (!l.$async)
      throw new Error("async schema referenced by sync schema");
    const v = s.let("valid");
    s.try(() => {
      s.code((0, qe._)`await ${(0, Ri.callValidateCode)(e, t, d)}`), y(t), o || s.assign(v, !0);
    }, (_) => {
      s.if((0, qe._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), w(_), o || s.assign(v, !1);
    }), e.ok(v);
  }
  function h() {
    e.result((0, Ri.callValidateCode)(e, t, d), () => y(t), () => w(t));
  }
  function w(v) {
    const _ = (0, qe._)`${v}.errors`;
    s.assign(cr.default.vErrors, (0, qe._)`${cr.default.vErrors} === null ? ${_} : ${cr.default.vErrors}.concat(${_})`), s.assign(cr.default.errors, (0, qe._)`${cr.default.vErrors}.length`);
  }
  function y(v) {
    var _;
    if (!a.opts.unevaluated)
      return;
    const g = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (a.props !== !0)
      if (g && !g.dynamicProps)
        g.props !== void 0 && (a.props = dn.mergeEvaluated.props(s, g.props, a.props));
      else {
        const m = s.var("props", (0, qe._)`${v}.evaluated.props`);
        a.props = dn.mergeEvaluated.props(s, m, a.props, qe.Name);
      }
    if (a.items !== !0)
      if (g && !g.dynamicItems)
        g.items !== void 0 && (a.items = dn.mergeEvaluated.items(s, g.items, a.items));
      else {
        const m = s.var("items", (0, qe._)`${v}.evaluated.items`);
        a.items = dn.mergeEvaluated.items(s, m, a.items, qe.Name);
      }
  }
}
Et.callRef = kn;
Et.default = cm;
Object.defineProperty(Na, "__esModule", { value: !0 });
const lm = Ra, um = Et, dm = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  lm.default,
  um.default
];
Na.default = dm;
var Oa = {}, Ia = {};
Object.defineProperty(Ia, "__esModule", { value: !0 });
const Gn = ee, Rt = Gn.operators, Hn = {
  maximum: { okStr: "<=", ok: Rt.LTE, fail: Rt.GT },
  minimum: { okStr: ">=", ok: Rt.GTE, fail: Rt.LT },
  exclusiveMaximum: { okStr: "<", ok: Rt.LT, fail: Rt.GTE },
  exclusiveMinimum: { okStr: ">", ok: Rt.GT, fail: Rt.LTE }
}, fm = {
  message: ({ keyword: e, schemaCode: t }) => (0, Gn.str)`must be ${Hn[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, Gn._)`{comparison: ${Hn[e].okStr}, limit: ${t}}`
}, hm = {
  keyword: Object.keys(Hn),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: fm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, Gn._)`${r} ${Hn[t].fail} ${n} || isNaN(${r})`);
  }
};
Ia.default = hm;
var Ta = {};
Object.defineProperty(Ta, "__esModule", { value: !0 });
const Br = ee, mm = {
  message: ({ schemaCode: e }) => (0, Br.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, Br._)`{multipleOf: ${e}}`
}, pm = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: mm,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), l = a ? (0, Br._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, Br._)`${o} !== parseInt(${o})`;
    e.fail$data((0, Br._)`(${n} === 0 || (${o} = ${r}/${n}, ${l}))`);
  }
};
Ta.default = pm;
var ja = {}, Aa = {};
Object.defineProperty(Aa, "__esModule", { value: !0 });
function Hl(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
Aa.default = Hl;
Hl.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(ja, "__esModule", { value: !0 });
const Xt = ee, $m = V, ym = Aa, gm = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, Xt.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, Xt._)`{limit: ${e}}`
}, _m = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: gm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? Xt.operators.GT : Xt.operators.LT, o = s.opts.unicode === !1 ? (0, Xt._)`${r}.length` : (0, Xt._)`${(0, $m.useFunc)(e.gen, ym.default)}(${r})`;
    e.fail$data((0, Xt._)`${o} ${a} ${n}`);
  }
};
ja.default = _m;
var ka = {};
Object.defineProperty(ka, "__esModule", { value: !0 });
const vm = ae, wm = V, pr = ee, Em = {
  message: ({ schemaCode: e }) => (0, pr.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, pr._)`{pattern: ${e}}`
}, bm = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Em,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, l = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, pr._)`new RegExp` : (0, wm.useFunc)(t, c), u = t.let("valid");
      t.try(() => t.assign(u, (0, pr._)`${d}(${a}, ${l}).test(${r})`), () => t.assign(u, !1)), e.fail$data((0, pr._)`!${u}`);
    } else {
      const c = (0, vm.usePattern)(e, s);
      e.fail$data((0, pr._)`!${c}.test(${r})`);
    }
  }
};
ka.default = bm;
var Ca = {};
Object.defineProperty(Ca, "__esModule", { value: !0 });
const Xr = ee, Sm = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, Xr.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, Xr._)`{limit: ${e}}`
}, Pm = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Sm,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? Xr.operators.GT : Xr.operators.LT;
    e.fail$data((0, Xr._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
Ca.default = Pm;
var Da = {};
Object.defineProperty(Da, "__esModule", { value: !0 });
const Fr = ae, Jr = ee, Nm = V, Rm = {
  message: ({ params: { missingProperty: e } }) => (0, Jr.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, Jr._)`{missingProperty: ${e}}`
}, Om = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Rm,
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
          (0, Nm.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(Jr.nil, h);
      else
        for (const y of r)
          (0, Fr.checkReportMissingProp)(e, y);
    }
    function u() {
      const y = t.let("missing");
      if (c || a) {
        const v = t.let("valid", !0);
        e.block$data(v, () => w(y, v)), e.ok(v);
      } else
        t.if((0, Fr.checkMissingProp)(e, r, y)), (0, Fr.reportMissingProp)(e, y), t.else();
    }
    function h() {
      t.forOf("prop", n, (y) => {
        e.setParams({ missingProperty: y }), t.if((0, Fr.noPropertyInData)(t, s, y, l.ownProperties), () => e.error());
      });
    }
    function w(y, v) {
      e.setParams({ missingProperty: y }), t.forOf(y, n, () => {
        t.assign(v, (0, Fr.propertyInData)(t, s, y, l.ownProperties)), t.if((0, Jr.not)(v), () => {
          e.error(), t.break();
        });
      }, Jr.nil);
    }
  }
};
Da.default = Om;
var Ma = {};
Object.defineProperty(Ma, "__esModule", { value: !0 });
const Wr = ee, Im = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, Wr.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, Wr._)`{limit: ${e}}`
}, Tm = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: Im,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? Wr.operators.GT : Wr.operators.LT;
    e.fail$data((0, Wr._)`${r}.length ${s} ${n}`);
  }
};
Ma.default = Tm;
var Va = {}, sn = {};
Object.defineProperty(sn, "__esModule", { value: !0 });
const Bl = Zn;
Bl.code = 'require("ajv/dist/runtime/equal").default';
sn.default = Bl;
Object.defineProperty(Va, "__esModule", { value: !0 });
const bs = we, Ne = ee, jm = V, Am = sn, km = {
  message: ({ params: { i: e, j: t } }) => (0, Ne.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, Ne._)`{i: ${e}, j: ${t}}`
}, Cm = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: km,
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
      const g = (0, jm.useFunc)(t, Am.default), m = t.name("outer");
      t.label(m).for((0, Ne._)`;${v}--;`, () => t.for((0, Ne._)`${_} = ${v}; ${_}--;`, () => t.if((0, Ne._)`${g}(${r}[${v}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Va.default = Cm;
var La = {};
Object.defineProperty(La, "__esModule", { value: !0 });
const Bs = ee, Dm = V, Mm = sn, Vm = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, Bs._)`{allowedValue: ${e}}`
}, Lm = {
  keyword: "const",
  $data: !0,
  error: Vm,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, Bs._)`!${(0, Dm.useFunc)(t, Mm.default)}(${r}, ${s})`) : e.fail((0, Bs._)`${a} !== ${r}`);
  }
};
La.default = Lm;
var Fa = {};
Object.defineProperty(Fa, "__esModule", { value: !0 });
const Kr = ee, Fm = V, zm = sn, Um = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Kr._)`{allowedValues: ${e}}`
}, qm = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: Um,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const l = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, Fm.useFunc)(t, zm.default));
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
Fa.default = qm;
Object.defineProperty(Oa, "__esModule", { value: !0 });
const Km = Ia, Gm = Ta, Hm = ja, Bm = ka, Xm = Ca, Jm = Da, Wm = Ma, Ym = Va, Qm = La, Zm = Fa, xm = [
  // number
  Km.default,
  Gm.default,
  // string
  Hm.default,
  Bm.default,
  // object
  Xm.default,
  Jm.default,
  // array
  Wm.default,
  Ym.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  Qm.default,
  Zm.default
];
Oa.default = xm;
var za = {}, Rr = {};
Object.defineProperty(Rr, "__esModule", { value: !0 });
Rr.validateAdditionalItems = void 0;
const Jt = ee, Xs = V, ep = {
  message: ({ params: { len: e } }) => (0, Jt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Jt._)`{limit: ${e}}`
}, tp = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: ep,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, Xs.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Xl(e, n);
  }
};
function Xl(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const l = r.const("len", (0, Jt._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, Jt._)`${l} <= ${t.length}`);
  else if (typeof n == "object" && !(0, Xs.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, Jt._)`${l} <= ${t.length}`);
    r.if((0, Jt.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, l, (u) => {
      e.subschema({ keyword: a, dataProp: u, dataPropType: Xs.Type.Num }, d), o.allErrors || r.if((0, Jt.not)(d), () => r.break());
    });
  }
}
Rr.validateAdditionalItems = Xl;
Rr.default = tp;
var Ua = {}, Or = {};
Object.defineProperty(Or, "__esModule", { value: !0 });
Or.validateTuple = void 0;
const Ii = ee, Cn = V, rp = ae, np = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return Jl(e, "additionalItems", t);
    r.items = !0, !(0, Cn.alwaysValidSchema)(r, t) && e.ok((0, rp.validateArray)(e));
  }
};
function Jl(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: l } = e;
  u(s), l.opts.unevaluated && r.length && l.items !== !0 && (l.items = Cn.mergeEvaluated.items(n, r.length, l.items));
  const c = n.name("valid"), d = n.const("len", (0, Ii._)`${a}.length`);
  r.forEach((h, w) => {
    (0, Cn.alwaysValidSchema)(l, h) || (n.if((0, Ii._)`${d} > ${w}`, () => e.subschema({
      keyword: o,
      schemaProp: w,
      dataProp: w
    }, c)), e.ok(c));
  });
  function u(h) {
    const { opts: w, errSchemaPath: y } = l, v = r.length, _ = v === h.minItems && (v === h.maxItems || h[t] === !1);
    if (w.strictTuples && !_) {
      const g = `"${o}" is ${v}-tuple, but minItems or maxItems/${t} are not specified or different at path "${y}"`;
      (0, Cn.checkStrictMode)(l, g, w.strictTuples);
    }
  }
}
Or.validateTuple = Jl;
Or.default = np;
Object.defineProperty(Ua, "__esModule", { value: !0 });
const sp = Or, ap = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, sp.validateTuple)(e, "items")
};
Ua.default = ap;
var qa = {};
Object.defineProperty(qa, "__esModule", { value: !0 });
const Ti = ee, op = V, ip = ae, cp = Rr, lp = {
  message: ({ params: { len: e } }) => (0, Ti.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Ti._)`{limit: ${e}}`
}, up = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: lp,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, op.alwaysValidSchema)(n, t) && (s ? (0, cp.validateAdditionalItems)(e, s) : e.ok((0, ip.validateArray)(e)));
  }
};
qa.default = up;
var Ka = {};
Object.defineProperty(Ka, "__esModule", { value: !0 });
const Je = ee, fn = V, dp = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Je.str)`must contain at least ${e} valid item(s)` : (0, Je.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Je._)`{minContains: ${e}}` : (0, Je._)`{minContains: ${e}, maxContains: ${t}}`
}, fp = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: dp,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, l;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, l = d) : o = 1;
    const u = t.const("len", (0, Je._)`${s}.length`);
    if (e.setParams({ min: o, max: l }), l === void 0 && o === 0) {
      (0, fn.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (l !== void 0 && o > l) {
      (0, fn.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, fn.alwaysValidSchema)(a, r)) {
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
          dataPropType: fn.Type.Num,
          compositeRule: !0
        }, _), g();
      });
    }
    function v(_) {
      t.code((0, Je._)`${_}++`), l === void 0 ? t.if((0, Je._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, Je._)`${_} > ${l}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, Je._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
Ka.default = fp;
var rs = {};
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
})(rs);
var Ga = {};
Object.defineProperty(Ga, "__esModule", { value: !0 });
const Wl = ee, hp = V, mp = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, Wl._)`{propertyName: ${e.propertyName}}`
}, pp = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: mp,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, hp.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, Wl.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
Ga.default = pp;
var ns = {};
Object.defineProperty(ns, "__esModule", { value: !0 });
const hn = ae, tt = ee, $p = Be, mn = V, yp = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, tt._)`{additionalProperty: ${e.additionalProperty}}`
}, gp = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: yp,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: l, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, mn.alwaysValidSchema)(o, r))
      return;
    const d = (0, hn.allSchemaProperties)(n.properties), u = (0, hn.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, tt._)`${a} === ${$p.default.errors}`);
    function h() {
      t.forIn("key", s, (g) => {
        !d.length && !u.length ? v(g) : t.if(w(g), () => v(g));
      });
    }
    function w(g) {
      let m;
      if (d.length > 8) {
        const E = (0, mn.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, hn.isOwnProperty)(t, E, g);
      } else d.length ? m = (0, tt.or)(...d.map((E) => (0, tt._)`${g} === ${E}`)) : m = tt.nil;
      return u.length && (m = (0, tt.or)(m, ...u.map((E) => (0, tt._)`${(0, hn.usePattern)(e, E)}.test(${g})`))), (0, tt.not)(m);
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
      if (typeof r == "object" && !(0, mn.alwaysValidSchema)(o, r)) {
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
        dataPropType: mn.Type.Str
      };
      E === !1 && Object.assign(R, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(R, m);
    }
  }
};
ns.default = gp;
var Ha = {};
Object.defineProperty(Ha, "__esModule", { value: !0 });
const _p = at, ji = ae, Ss = V, Ai = ns, vp = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && Ai.default.code(new _p.KeywordCxt(a, Ai.default, "additionalProperties"));
    const o = (0, ji.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = Ss.mergeEvaluated.props(t, (0, Ss.toHash)(o), a.props));
    const l = o.filter((h) => !(0, Ss.alwaysValidSchema)(a, r[h]));
    if (l.length === 0)
      return;
    const c = t.name("valid");
    for (const h of l)
      d(h) ? u(h) : (t.if((0, ji.propertyInData)(t, s, h, a.opts.ownProperties)), u(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
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
Ha.default = vp;
var Ba = {};
Object.defineProperty(Ba, "__esModule", { value: !0 });
const ki = ae, pn = ee, Ci = V, Di = V, wp = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, l = (0, ki.allSchemaProperties)(r), c = l.filter((_) => (0, Ci.alwaysValidSchema)(a, r[_]));
    if (l.length === 0 || c.length === l.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, u = t.name("valid");
    a.props !== !0 && !(a.props instanceof pn.Name) && (a.props = (0, Di.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    w();
    function w() {
      for (const _ of l)
        d && y(_), a.allErrors ? v(_) : (t.var(u, !0), v(_), t.if(u));
    }
    function y(_) {
      for (const g in d)
        new RegExp(_).test(g) && (0, Ci.checkStrictMode)(a, `property ${g} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function v(_) {
      t.forIn("key", n, (g) => {
        t.if((0, pn._)`${(0, ki.usePattern)(e, _)}.test(${g})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: g,
            dataPropType: Di.Type.Str
          }, u), a.opts.unevaluated && h !== !0 ? t.assign((0, pn._)`${h}[${g}]`, !0) : !m && !a.allErrors && t.if((0, pn.not)(u), () => t.break());
        });
      });
    }
  }
};
Ba.default = wp;
var Xa = {};
Object.defineProperty(Xa, "__esModule", { value: !0 });
const Ep = V, bp = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, Ep.alwaysValidSchema)(n, r)) {
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
Xa.default = bp;
var Ja = {};
Object.defineProperty(Ja, "__esModule", { value: !0 });
const Sp = ae, Pp = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: Sp.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Ja.default = Pp;
var Wa = {};
Object.defineProperty(Wa, "__esModule", { value: !0 });
const Dn = ee, Np = V, Rp = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, Dn._)`{passingSchemas: ${e.passing}}`
}, Op = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Rp,
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
        (0, Np.alwaysValidSchema)(s, u) ? t.var(c, !0) : w = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, Dn._)`${c} && ${o}`).assign(o, !1).assign(l, (0, Dn._)`[${l}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(l, h), w && e.mergeEvaluated(w, Dn.Name);
        });
      });
    }
  }
};
Wa.default = Op;
var Ya = {};
Object.defineProperty(Ya, "__esModule", { value: !0 });
const Ip = V, Tp = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, Ip.alwaysValidSchema)(n, a))
        return;
      const l = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(l);
    });
  }
};
Ya.default = Tp;
var Qa = {};
Object.defineProperty(Qa, "__esModule", { value: !0 });
const Bn = ee, Yl = V, jp = {
  message: ({ params: e }) => (0, Bn.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, Bn._)`{failingKeyword: ${e.ifClause}}`
}, Ap = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: jp,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Yl.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = Mi(n, "then"), a = Mi(n, "else");
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
function Mi(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Yl.alwaysValidSchema)(e, r);
}
Qa.default = Ap;
var Za = {};
Object.defineProperty(Za, "__esModule", { value: !0 });
const kp = V, Cp = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, kp.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
Za.default = Cp;
Object.defineProperty(za, "__esModule", { value: !0 });
const Dp = Rr, Mp = Ua, Vp = Or, Lp = qa, Fp = Ka, zp = rs, Up = Ga, qp = ns, Kp = Ha, Gp = Ba, Hp = Xa, Bp = Ja, Xp = Wa, Jp = Ya, Wp = Qa, Yp = Za;
function Qp(e = !1) {
  const t = [
    // any
    Hp.default,
    Bp.default,
    Xp.default,
    Jp.default,
    Wp.default,
    Yp.default,
    // object
    Up.default,
    qp.default,
    zp.default,
    Kp.default,
    Gp.default
  ];
  return e ? t.push(Mp.default, Lp.default) : t.push(Dp.default, Vp.default), t.push(Fp.default), t;
}
za.default = Qp;
var xa = {}, Ir = {};
Object.defineProperty(Ir, "__esModule", { value: !0 });
Ir.dynamicAnchor = void 0;
const Ps = ee, Zp = Be, Vi = Fe, xp = Et, e$ = {
  keyword: "$dynamicAnchor",
  schemaType: "string",
  code: (e) => Ql(e, e.schema)
};
function Ql(e, t) {
  const { gen: r, it: n } = e;
  n.schemaEnv.root.dynamicAnchors[t] = !0;
  const s = (0, Ps._)`${Zp.default.dynamicAnchors}${(0, Ps.getProperty)(t)}`, a = n.errSchemaPath === "#" ? n.validateName : t$(e);
  r.if((0, Ps._)`!${s}`, () => r.assign(s, a));
}
Ir.dynamicAnchor = Ql;
function t$(e) {
  const { schemaEnv: t, schema: r, self: n } = e.it, { root: s, baseId: a, localRefs: o, meta: l } = t.root, { schemaId: c } = n.opts, d = new Vi.SchemaEnv({ schema: r, schemaId: c, root: s, baseId: a, localRefs: o, meta: l });
  return Vi.compileSchema.call(n, d), (0, xp.getValidate)(e, d);
}
Ir.default = e$;
var Tr = {};
Object.defineProperty(Tr, "__esModule", { value: !0 });
Tr.dynamicRef = void 0;
const Li = ee, r$ = Be, Fi = Et, n$ = {
  keyword: "$dynamicRef",
  schemaType: "string",
  code: (e) => Zl(e, e.schema)
};
function Zl(e, t) {
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
      const d = r.let("_v", (0, Li._)`${r$.default.dynamicAnchors}${(0, Li.getProperty)(a)}`);
      r.if(d, l(d, c), l(s.validateName, c));
    } else
      l(s.validateName, c)();
  }
  function l(c, d) {
    return d ? () => r.block(() => {
      (0, Fi.callRef)(e, c), r.let(d, !0);
    }) : () => (0, Fi.callRef)(e, c);
  }
}
Tr.dynamicRef = Zl;
Tr.default = n$;
var eo = {};
Object.defineProperty(eo, "__esModule", { value: !0 });
const s$ = Ir, a$ = V, o$ = {
  keyword: "$recursiveAnchor",
  schemaType: "boolean",
  code(e) {
    e.schema ? (0, s$.dynamicAnchor)(e, "") : (0, a$.checkStrictMode)(e.it, "$recursiveAnchor: false is ignored");
  }
};
eo.default = o$;
var to = {};
Object.defineProperty(to, "__esModule", { value: !0 });
const i$ = Tr, c$ = {
  keyword: "$recursiveRef",
  schemaType: "string",
  code: (e) => (0, i$.dynamicRef)(e, e.schema)
};
to.default = c$;
Object.defineProperty(xa, "__esModule", { value: !0 });
const l$ = Ir, u$ = Tr, d$ = eo, f$ = to, h$ = [l$.default, u$.default, d$.default, f$.default];
xa.default = h$;
var ro = {}, no = {};
Object.defineProperty(no, "__esModule", { value: !0 });
const zi = rs, m$ = {
  keyword: "dependentRequired",
  type: "object",
  schemaType: "object",
  error: zi.error,
  code: (e) => (0, zi.validatePropertyDeps)(e)
};
no.default = m$;
var so = {};
Object.defineProperty(so, "__esModule", { value: !0 });
const p$ = rs, $$ = {
  keyword: "dependentSchemas",
  type: "object",
  schemaType: "object",
  code: (e) => (0, p$.validateSchemaDeps)(e)
};
so.default = $$;
var ao = {};
Object.defineProperty(ao, "__esModule", { value: !0 });
const y$ = V, g$ = {
  keyword: ["maxContains", "minContains"],
  type: "array",
  schemaType: "number",
  code({ keyword: e, parentSchema: t, it: r }) {
    t.contains === void 0 && (0, y$.checkStrictMode)(r, `"${e}" without "contains" is ignored`);
  }
};
ao.default = g$;
Object.defineProperty(ro, "__esModule", { value: !0 });
const _$ = no, v$ = so, w$ = ao, E$ = [_$.default, v$.default, w$.default];
ro.default = E$;
var oo = {}, io = {};
Object.defineProperty(io, "__esModule", { value: !0 });
const Tt = ee, Ui = V, b$ = Be, S$ = {
  message: "must NOT have unevaluated properties",
  params: ({ params: e }) => (0, Tt._)`{unevaluatedProperty: ${e.unevaluatedProperty}}`
}, P$ = {
  keyword: "unevaluatedProperties",
  type: "object",
  schemaType: ["boolean", "object"],
  trackErrors: !0,
  error: S$,
  code(e) {
    const { gen: t, schema: r, data: n, errsCount: s, it: a } = e;
    if (!s)
      throw new Error("ajv implementation error");
    const { allErrors: o, props: l } = a;
    l instanceof Tt.Name ? t.if((0, Tt._)`${l} !== true`, () => t.forIn("key", n, (h) => t.if(d(l, h), () => c(h)))) : l !== !0 && t.forIn("key", n, (h) => l === void 0 ? c(h) : t.if(u(l, h), () => c(h))), a.props = !0, e.ok((0, Tt._)`${s} === ${b$.default.errors}`);
    function c(h) {
      if (r === !1) {
        e.setParams({ unevaluatedProperty: h }), e.error(), o || t.break();
        return;
      }
      if (!(0, Ui.alwaysValidSchema)(a, r)) {
        const w = t.name("valid");
        e.subschema({
          keyword: "unevaluatedProperties",
          dataProp: h,
          dataPropType: Ui.Type.Str
        }, w), o || t.if((0, Tt.not)(w), () => t.break());
      }
    }
    function d(h, w) {
      return (0, Tt._)`!${h} || !${h}[${w}]`;
    }
    function u(h, w) {
      const y = [];
      for (const v in h)
        h[v] === !0 && y.push((0, Tt._)`${w} !== ${v}`);
      return (0, Tt.and)(...y);
    }
  }
};
io.default = P$;
var co = {};
Object.defineProperty(co, "__esModule", { value: !0 });
const Wt = ee, qi = V, N$ = {
  message: ({ params: { len: e } }) => (0, Wt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Wt._)`{limit: ${e}}`
}, R$ = {
  keyword: "unevaluatedItems",
  type: "array",
  schemaType: ["boolean", "object"],
  error: N$,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e, a = s.items || 0;
    if (a === !0)
      return;
    const o = t.const("len", (0, Wt._)`${n}.length`);
    if (r === !1)
      e.setParams({ len: a }), e.fail((0, Wt._)`${o} > ${a}`);
    else if (typeof r == "object" && !(0, qi.alwaysValidSchema)(s, r)) {
      const c = t.var("valid", (0, Wt._)`${o} <= ${a}`);
      t.if((0, Wt.not)(c), () => l(c, a)), e.ok(c);
    }
    s.items = !0;
    function l(c, d) {
      t.forRange("i", d, o, (u) => {
        e.subschema({ keyword: "unevaluatedItems", dataProp: u, dataPropType: qi.Type.Num }, c), s.allErrors || t.if((0, Wt.not)(c), () => t.break());
      });
    }
  }
};
co.default = R$;
Object.defineProperty(oo, "__esModule", { value: !0 });
const O$ = io, I$ = co, T$ = [O$.default, I$.default];
oo.default = T$;
var lo = {}, uo = {};
Object.defineProperty(uo, "__esModule", { value: !0 });
const ge = ee, j$ = {
  message: ({ schemaCode: e }) => (0, ge.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, ge._)`{format: ${e}}`
}, A$ = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: j$,
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
uo.default = A$;
Object.defineProperty(lo, "__esModule", { value: !0 });
const k$ = uo, C$ = [k$.default];
lo.default = C$;
var Sr = {};
Object.defineProperty(Sr, "__esModule", { value: !0 });
Sr.contentVocabulary = Sr.metadataVocabulary = void 0;
Sr.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
Sr.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(Pa, "__esModule", { value: !0 });
const D$ = Na, M$ = Oa, V$ = za, L$ = xa, F$ = ro, z$ = oo, U$ = lo, Ki = Sr, q$ = [
  L$.default,
  D$.default,
  M$.default,
  (0, V$.default)(!0),
  U$.default,
  Ki.metadataVocabulary,
  Ki.contentVocabulary,
  F$.default,
  z$.default
];
Pa.default = q$;
var fo = {}, ss = {};
Object.defineProperty(ss, "__esModule", { value: !0 });
ss.DiscrError = void 0;
var Gi;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(Gi || (ss.DiscrError = Gi = {}));
Object.defineProperty(fo, "__esModule", { value: !0 });
const dr = ee, Js = ss, Hi = Fe, K$ = Nr, G$ = V, H$ = {
  message: ({ params: { discrError: e, tagName: t } }) => e === Js.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, dr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, B$ = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: H$,
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
    t.if((0, dr._)`typeof ${d} == "string"`, () => u(), () => e.error(!1, { discrError: Js.DiscrError.Tag, tag: d, tagName: l })), e.ok(c);
    function u() {
      const y = w();
      t.if(!1);
      for (const v in y)
        t.elseIf((0, dr._)`${d} === ${v}`), t.assign(c, h(y[v]));
      t.else(), e.error(!1, { discrError: Js.DiscrError.Mapping, tag: d, tagName: l }), t.endIf();
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
        if (T != null && T.$ref && !(0, G$.schemaHasRulesButRef)(T, a.self.RULES)) {
          const J = T.$ref;
          if (T = Hi.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, J), T instanceof Hi.SchemaEnv && (T = T.schema), T === void 0)
            throw new K$.default(a.opts.uriResolver, a.baseId, J);
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
fo.default = B$;
var ho = {};
const X$ = "https://json-schema.org/draft/2020-12/schema", J$ = "https://json-schema.org/draft/2020-12/schema", W$ = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0,
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0,
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
  "https://json-schema.org/draft/2020-12/vocab/validation": !0,
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, Y$ = "meta", Q$ = "Core and Validation specifications meta-schema", Z$ = [
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
], x$ = [
  "object",
  "boolean"
], ey = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.", ty = {
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
}, ry = {
  $schema: X$,
  $id: J$,
  $vocabulary: W$,
  $dynamicAnchor: Y$,
  title: Q$,
  allOf: Z$,
  type: x$,
  $comment: ey,
  properties: ty
}, ny = "https://json-schema.org/draft/2020-12/schema", sy = "https://json-schema.org/draft/2020-12/meta/applicator", ay = {
  "https://json-schema.org/draft/2020-12/vocab/applicator": !0
}, oy = "meta", iy = "Applicator vocabulary meta-schema", cy = [
  "object",
  "boolean"
], ly = {
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
}, uy = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $dynamicRef: "#meta"
    }
  }
}, dy = {
  $schema: ny,
  $id: sy,
  $vocabulary: ay,
  $dynamicAnchor: oy,
  title: iy,
  type: cy,
  properties: ly,
  $defs: uy
}, fy = "https://json-schema.org/draft/2020-12/schema", hy = "https://json-schema.org/draft/2020-12/meta/unevaluated", my = {
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0
}, py = "meta", $y = "Unevaluated applicator vocabulary meta-schema", yy = [
  "object",
  "boolean"
], gy = {
  unevaluatedItems: {
    $dynamicRef: "#meta"
  },
  unevaluatedProperties: {
    $dynamicRef: "#meta"
  }
}, _y = {
  $schema: fy,
  $id: hy,
  $vocabulary: my,
  $dynamicAnchor: py,
  title: $y,
  type: yy,
  properties: gy
}, vy = "https://json-schema.org/draft/2020-12/schema", wy = "https://json-schema.org/draft/2020-12/meta/content", Ey = {
  "https://json-schema.org/draft/2020-12/vocab/content": !0
}, by = "meta", Sy = "Content vocabulary meta-schema", Py = [
  "object",
  "boolean"
], Ny = {
  contentEncoding: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentSchema: {
    $dynamicRef: "#meta"
  }
}, Ry = {
  $schema: vy,
  $id: wy,
  $vocabulary: Ey,
  $dynamicAnchor: by,
  title: Sy,
  type: Py,
  properties: Ny
}, Oy = "https://json-schema.org/draft/2020-12/schema", Iy = "https://json-schema.org/draft/2020-12/meta/core", Ty = {
  "https://json-schema.org/draft/2020-12/vocab/core": !0
}, jy = "meta", Ay = "Core vocabulary meta-schema", ky = [
  "object",
  "boolean"
], Cy = {
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
}, Dy = {
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
}, My = {
  $schema: Oy,
  $id: Iy,
  $vocabulary: Ty,
  $dynamicAnchor: jy,
  title: Ay,
  type: ky,
  properties: Cy,
  $defs: Dy
}, Vy = "https://json-schema.org/draft/2020-12/schema", Ly = "https://json-schema.org/draft/2020-12/meta/format-annotation", Fy = {
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0
}, zy = "meta", Uy = "Format vocabulary meta-schema for annotation results", qy = [
  "object",
  "boolean"
], Ky = {
  format: {
    type: "string"
  }
}, Gy = {
  $schema: Vy,
  $id: Ly,
  $vocabulary: Fy,
  $dynamicAnchor: zy,
  title: Uy,
  type: qy,
  properties: Ky
}, Hy = "https://json-schema.org/draft/2020-12/schema", By = "https://json-schema.org/draft/2020-12/meta/meta-data", Xy = {
  "https://json-schema.org/draft/2020-12/vocab/meta-data": !0
}, Jy = "meta", Wy = "Meta-data vocabulary meta-schema", Yy = [
  "object",
  "boolean"
], Qy = {
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
}, Zy = {
  $schema: Hy,
  $id: By,
  $vocabulary: Xy,
  $dynamicAnchor: Jy,
  title: Wy,
  type: Yy,
  properties: Qy
}, xy = "https://json-schema.org/draft/2020-12/schema", e0 = "https://json-schema.org/draft/2020-12/meta/validation", t0 = {
  "https://json-schema.org/draft/2020-12/vocab/validation": !0
}, r0 = "meta", n0 = "Validation vocabulary meta-schema", s0 = [
  "object",
  "boolean"
], a0 = {
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
}, o0 = {
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
}, i0 = {
  $schema: xy,
  $id: e0,
  $vocabulary: t0,
  $dynamicAnchor: r0,
  title: n0,
  type: s0,
  properties: a0,
  $defs: o0
};
Object.defineProperty(ho, "__esModule", { value: !0 });
const c0 = ry, l0 = dy, u0 = _y, d0 = Ry, f0 = My, h0 = Gy, m0 = Zy, p0 = i0, $0 = ["/properties"];
function y0(e) {
  return [
    c0,
    l0,
    u0,
    d0,
    f0,
    t(this, h0),
    m0,
    t(this, p0)
  ].forEach((r) => this.addMetaSchema(r, void 0, !1)), this;
  function t(r, n) {
    return e ? r.$dataMetaSchema(n, $0) : n;
  }
}
ho.default = y0;
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv2020 = void 0;
  const r = Yc, n = Pa, s = fo, a = ho, o = "https://json-schema.org/draft/2020-12/schema";
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
  var c = at;
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
  var u = nn;
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return u.default;
  } });
  var h = Nr;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return h.default;
  } });
})(Us, Us.exports);
var g0 = Us.exports, Ws = { exports: {} }, xl = {};
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
})(xl);
var eu = {}, Ys = { exports: {} }, tu = {}, $t = {}, Gt = {}, Ns = {}, ne = {}, tn = {};
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
})(tn);
var Qs = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = tn;
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
})(Qs);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = tn, r = Qs;
  var n = tn;
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
const ue = ne, _0 = tn;
function v0(e) {
  const t = {};
  for (const r of e)
    t[r] = !0;
  return t;
}
L.toHash = v0;
function w0(e, t) {
  return typeof t == "boolean" ? t : Object.keys(t).length === 0 ? !0 : (ru(e, t), !nu(t, e.self.RULES.all));
}
L.alwaysValidSchema = w0;
function ru(e, t = e.schema) {
  const { opts: r, self: n } = e;
  if (!r.strictSchema || typeof t == "boolean")
    return;
  const s = n.RULES.keywords;
  for (const a in t)
    s[a] || ou(e, `unknown keyword: "${a}"`);
}
L.checkUnknownRules = ru;
function nu(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t[r])
      return !0;
  return !1;
}
L.schemaHasRules = nu;
function E0(e, t) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (r !== "$ref" && t.all[r])
      return !0;
  return !1;
}
L.schemaHasRulesButRef = E0;
function b0({ topSchemaRef: e, schemaPath: t }, r, n, s) {
  if (!s) {
    if (typeof r == "number" || typeof r == "boolean")
      return r;
    if (typeof r == "string")
      return (0, ue._)`${r}`;
  }
  return (0, ue._)`${e}${t}${(0, ue.getProperty)(n)}`;
}
L.schemaRefOrVal = b0;
function S0(e) {
  return su(decodeURIComponent(e));
}
L.unescapeFragment = S0;
function P0(e) {
  return encodeURIComponent(mo(e));
}
L.escapeFragment = P0;
function mo(e) {
  return typeof e == "number" ? `${e}` : e.replace(/~/g, "~0").replace(/\//g, "~1");
}
L.escapeJsonPointer = mo;
function su(e) {
  return e.replace(/~1/g, "/").replace(/~0/g, "~");
}
L.unescapeJsonPointer = su;
function N0(e, t) {
  if (Array.isArray(e))
    for (const r of e)
      t(r);
  else
    t(e);
}
L.eachItem = N0;
function Bi({ mergeNames: e, mergeToName: t, mergeValues: r, resultToName: n }) {
  return (s, a, o, l) => {
    const c = o === void 0 ? a : o instanceof ue.Name ? (a instanceof ue.Name ? e(s, a, o) : t(s, a, o), o) : a instanceof ue.Name ? (t(s, o, a), a) : r(a, o);
    return l === ue.Name && !(c instanceof ue.Name) ? n(s, c) : c;
  };
}
L.mergeEvaluated = {
  props: Bi({
    mergeNames: (e, t, r) => e.if((0, ue._)`${r} !== true && ${t} !== undefined`, () => {
      e.if((0, ue._)`${t} === true`, () => e.assign(r, !0), () => e.assign(r, (0, ue._)`${r} || {}`).code((0, ue._)`Object.assign(${r}, ${t})`));
    }),
    mergeToName: (e, t, r) => e.if((0, ue._)`${r} !== true`, () => {
      t === !0 ? e.assign(r, !0) : (e.assign(r, (0, ue._)`${r} || {}`), po(e, r, t));
    }),
    mergeValues: (e, t) => e === !0 ? !0 : { ...e, ...t },
    resultToName: au
  }),
  items: Bi({
    mergeNames: (e, t, r) => e.if((0, ue._)`${r} !== true && ${t} !== undefined`, () => e.assign(r, (0, ue._)`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`)),
    mergeToName: (e, t, r) => e.if((0, ue._)`${r} !== true`, () => e.assign(r, t === !0 ? !0 : (0, ue._)`${r} > ${t} ? ${r} : ${t}`)),
    mergeValues: (e, t) => e === !0 ? !0 : Math.max(e, t),
    resultToName: (e, t) => e.var("items", t)
  })
};
function au(e, t) {
  if (t === !0)
    return e.var("props", !0);
  const r = e.var("props", (0, ue._)`{}`);
  return t !== void 0 && po(e, r, t), r;
}
L.evaluatedPropsToName = au;
function po(e, t, r) {
  Object.keys(r).forEach((n) => e.assign((0, ue._)`${t}${(0, ue.getProperty)(n)}`, !0));
}
L.setEvaluated = po;
const Xi = {};
function R0(e, t) {
  return e.scopeValue("func", {
    ref: t,
    code: Xi[t.code] || (Xi[t.code] = new _0._Code(t.code))
  });
}
L.useFunc = R0;
var Zs;
(function(e) {
  e[e.Num = 0] = "Num", e[e.Str = 1] = "Str";
})(Zs || (L.Type = Zs = {}));
function O0(e, t, r) {
  if (e instanceof ue.Name) {
    const n = t === Zs.Num;
    return r ? n ? (0, ue._)`"[" + ${e} + "]"` : (0, ue._)`"['" + ${e} + "']"` : n ? (0, ue._)`"/" + ${e}` : (0, ue._)`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
  }
  return r ? (0, ue.getProperty)(e).toString() : "/" + mo(e);
}
L.getErrorPath = O0;
function ou(e, t, r = e.opts.strictSchema) {
  if (r) {
    if (t = `strict mode: ${t}`, r === !0)
      throw new Error(t);
    e.self.logger.warn(t);
  }
}
L.checkStrictMode = ou;
var $n = {}, Ji;
function Ft() {
  if (Ji) return $n;
  Ji = 1, Object.defineProperty($n, "__esModule", { value: !0 });
  const e = ne, t = {
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
  return $n.default = t, $n;
}
var Wi;
function as() {
  return Wi || (Wi = 1, function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
    const t = ne, r = L, n = Ft();
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
  }(Ns)), Ns;
}
var Yi;
function I0() {
  if (Yi) return Gt;
  Yi = 1, Object.defineProperty(Gt, "__esModule", { value: !0 }), Gt.boolOrEmptySchema = Gt.topBoolOrEmptySchema = void 0;
  const e = as(), t = ne, r = Ft(), n = {
    message: "boolean schema is false"
  };
  function s(l) {
    const { gen: c, schema: d, validateName: u } = l;
    d === !1 ? o(l, !1) : typeof d == "object" && d.$async === !0 ? c.return(r.default.data) : (c.assign((0, t._)`${u}.errors`, null), c.return(!0));
  }
  Gt.topBoolOrEmptySchema = s;
  function a(l, c) {
    const { gen: d, schema: u } = l;
    u === !1 ? (d.var(c, !1), o(l)) : d.var(c, !0);
  }
  Gt.boolOrEmptySchema = a;
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
  return Gt;
}
var Ee = {}, sr = {};
Object.defineProperty(sr, "__esModule", { value: !0 });
sr.getRules = sr.isJSONType = void 0;
const T0 = ["string", "number", "integer", "boolean", "null", "object", "array"], j0 = new Set(T0);
function A0(e) {
  return typeof e == "string" && j0.has(e);
}
sr.isJSONType = A0;
function k0() {
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
sr.getRules = k0;
var yt = {}, Qi;
function iu() {
  if (Qi) return yt;
  Qi = 1, Object.defineProperty(yt, "__esModule", { value: !0 }), yt.shouldUseRule = yt.shouldUseGroup = yt.schemaHasRulesForType = void 0;
  function e({ schema: n, self: s }, a) {
    const o = s.RULES.types[a];
    return o && o !== !0 && t(n, o);
  }
  yt.schemaHasRulesForType = e;
  function t(n, s) {
    return s.rules.some((a) => r(n, a));
  }
  yt.shouldUseGroup = t;
  function r(n, s) {
    var a;
    return n[s.keyword] !== void 0 || ((a = s.definition.implements) === null || a === void 0 ? void 0 : a.some((o) => n[o] !== void 0));
  }
  return yt.shouldUseRule = r, yt;
}
Object.defineProperty(Ee, "__esModule", { value: !0 });
Ee.reportTypeError = Ee.checkDataTypes = Ee.checkDataType = Ee.coerceAndCheckDataType = Ee.getJSONTypes = Ee.getSchemaTypes = Ee.DataType = void 0;
const C0 = sr, D0 = iu(), M0 = as(), re = ne, cu = L;
var _r;
(function(e) {
  e[e.Correct = 0] = "Correct", e[e.Wrong = 1] = "Wrong";
})(_r || (Ee.DataType = _r = {}));
function V0(e) {
  const t = lu(e.type);
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
Ee.getSchemaTypes = V0;
function lu(e) {
  const t = Array.isArray(e) ? e : e ? [e] : [];
  if (t.every(C0.isJSONType))
    return t;
  throw new Error("type must be JSONType or JSONType[]: " + t.join(","));
}
Ee.getJSONTypes = lu;
function L0(e, t) {
  const { gen: r, data: n, opts: s } = e, a = F0(t, s.coerceTypes), o = t.length > 0 && !(a.length === 0 && t.length === 1 && (0, D0.schemaHasRulesForType)(e, t[0]));
  if (o) {
    const l = $o(t, n, s.strictNumbers, _r.Wrong);
    r.if(l, () => {
      a.length ? z0(e, t, a) : yo(e);
    });
  }
  return o;
}
Ee.coerceAndCheckDataType = L0;
const uu = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
function F0(e, t) {
  return t ? e.filter((r) => uu.has(r) || t === "array" && r === "array") : [];
}
function z0(e, t, r) {
  const { gen: n, data: s, opts: a } = e, o = n.let("dataType", (0, re._)`typeof ${s}`), l = n.let("coerced", (0, re._)`undefined`);
  a.coerceTypes === "array" && n.if((0, re._)`${o} == 'object' && Array.isArray(${s}) && ${s}.length == 1`, () => n.assign(s, (0, re._)`${s}[0]`).assign(o, (0, re._)`typeof ${s}`).if($o(t, s, a.strictNumbers), () => n.assign(l, s))), n.if((0, re._)`${l} !== undefined`);
  for (const d of r)
    (uu.has(d) || d === "array" && a.coerceTypes === "array") && c(d);
  n.else(), yo(e), n.endIf(), n.if((0, re._)`${l} !== undefined`, () => {
    n.assign(s, l), U0(e, l);
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
function U0({ gen: e, parentData: t, parentDataProperty: r }, n) {
  e.if((0, re._)`${t} !== undefined`, () => e.assign((0, re._)`${t}[${r}]`, n));
}
function xs(e, t, r, n = _r.Correct) {
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
Ee.checkDataType = xs;
function $o(e, t, r, n) {
  if (e.length === 1)
    return xs(e[0], t, r, n);
  let s;
  const a = (0, cu.toHash)(e);
  if (a.array && a.object) {
    const o = (0, re._)`typeof ${t} != "object"`;
    s = a.null ? o : (0, re._)`!${t} || ${o}`, delete a.null, delete a.array, delete a.object;
  } else
    s = re.nil;
  a.number && delete a.integer;
  for (const o in a)
    s = (0, re.and)(s, xs(o, t, r, n));
  return s;
}
Ee.checkDataTypes = $o;
const q0 = {
  message: ({ schema: e }) => `must be ${e}`,
  params: ({ schema: e, schemaValue: t }) => typeof e == "string" ? (0, re._)`{type: ${e}}` : (0, re._)`{type: ${t}}`
};
function yo(e) {
  const t = K0(e);
  (0, M0.reportError)(t, q0);
}
Ee.reportTypeError = yo;
function K0(e) {
  const { gen: t, data: r, schema: n } = e, s = (0, cu.schemaRefOrVal)(e, n, "type");
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
var zr = {}, Zi;
function G0() {
  if (Zi) return zr;
  Zi = 1, Object.defineProperty(zr, "__esModule", { value: !0 }), zr.assignDefaults = void 0;
  const e = ne, t = L;
  function r(s, a) {
    const { properties: o, items: l } = s.schema;
    if (a === "object" && o)
      for (const c in o)
        n(s, c, o[c].default);
    else a === "array" && Array.isArray(l) && l.forEach((c, d) => n(s, d, c.default));
  }
  zr.assignDefaults = r;
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
  return zr;
}
var xe = {}, oe = {};
Object.defineProperty(oe, "__esModule", { value: !0 });
oe.validateUnion = oe.validateArray = oe.usePattern = oe.callValidateCode = oe.schemaProperties = oe.allSchemaProperties = oe.noPropertyInData = oe.propertyInData = oe.isOwnProperty = oe.hasPropFunc = oe.reportMissingProp = oe.checkMissingProp = oe.checkReportMissingProp = void 0;
const he = ne, go = L, Ot = Ft(), H0 = L;
function B0(e, t) {
  const { gen: r, data: n, it: s } = e;
  r.if(vo(r, n, t, s.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, he._)`${t}` }, !0), e.error();
  });
}
oe.checkReportMissingProp = B0;
function X0({ gen: e, data: t, it: { opts: r } }, n, s) {
  return (0, he.or)(...n.map((a) => (0, he.and)(vo(e, t, a, r.ownProperties), (0, he._)`${s} = ${a}`)));
}
oe.checkMissingProp = X0;
function J0(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
oe.reportMissingProp = J0;
function du(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, he._)`Object.prototype.hasOwnProperty`
  });
}
oe.hasPropFunc = du;
function _o(e, t, r) {
  return (0, he._)`${du(e)}.call(${t}, ${r})`;
}
oe.isOwnProperty = _o;
function W0(e, t, r, n) {
  const s = (0, he._)`${t}${(0, he.getProperty)(r)} !== undefined`;
  return n ? (0, he._)`${s} && ${_o(e, t, r)}` : s;
}
oe.propertyInData = W0;
function vo(e, t, r, n) {
  const s = (0, he._)`${t}${(0, he.getProperty)(r)} === undefined`;
  return n ? (0, he.or)(s, (0, he.not)(_o(e, t, r))) : s;
}
oe.noPropertyInData = vo;
function fu(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
oe.allSchemaProperties = fu;
function Y0(e, t) {
  return fu(t).filter((r) => !(0, go.alwaysValidSchema)(e, t[r]));
}
oe.schemaProperties = Y0;
function Q0({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: s, errorPath: a }, it: o }, l, c, d) {
  const u = d ? (0, he._)`${e}, ${t}, ${n}${s}` : t, h = [
    [Ot.default.instancePath, (0, he.strConcat)(Ot.default.instancePath, a)],
    [Ot.default.parentData, o.parentData],
    [Ot.default.parentDataProperty, o.parentDataProperty],
    [Ot.default.rootData, Ot.default.rootData]
  ];
  o.opts.dynamicRef && h.push([Ot.default.dynamicAnchors, Ot.default.dynamicAnchors]);
  const w = (0, he._)`${u}, ${r.object(...h)}`;
  return c !== he.nil ? (0, he._)`${l}.call(${c}, ${w})` : (0, he._)`${l}(${w})`;
}
oe.callValidateCode = Q0;
const Z0 = (0, he._)`new RegExp`;
function x0({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: s } = t.code, a = s(r, n);
  return e.scopeValue("pattern", {
    key: a.toString(),
    ref: a,
    code: (0, he._)`${s.code === "new RegExp" ? Z0 : (0, H0.useFunc)(e, s)}(${r}, ${n})`
  });
}
oe.usePattern = x0;
function eg(e) {
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
        dataPropType: go.Type.Num
      }, a), t.if((0, he.not)(a), l);
    });
  }
}
oe.validateArray = eg;
function tg(e) {
  const { gen: t, schema: r, keyword: n, it: s } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((c) => (0, go.alwaysValidSchema)(s, c)) && !s.opts.unevaluated)
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
oe.validateUnion = tg;
var xi;
function rg() {
  if (xi) return xe;
  xi = 1, Object.defineProperty(xe, "__esModule", { value: !0 }), xe.validateKeywordUsage = xe.validSchemaType = xe.funcKeywordCode = xe.macroKeywordCode = void 0;
  const e = ne, t = Ft(), r = oe, n = as();
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
  xe.macroKeywordCode = s;
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
  xe.funcKeywordCode = a;
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
  xe.validSchemaType = u;
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
  return xe.validateKeywordUsage = h, xe;
}
var gt = {}, ec;
function ng() {
  if (ec) return gt;
  ec = 1, Object.defineProperty(gt, "__esModule", { value: !0 }), gt.extendSubschemaMode = gt.extendSubschemaData = gt.getSubschema = void 0;
  const e = ne, t = L;
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
var Ie = {}, hu = { exports: {} }, Vt = hu.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, s = r.post || function() {
  };
  Mn(t, n, s, e, "", e);
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
function Mn(e, t, r, n, s, a, o, l, c, d) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, s, a, o, l, c, d);
    for (var u in n) {
      var h = n[u];
      if (Array.isArray(h)) {
        if (u in Vt.arrayKeywords)
          for (var w = 0; w < h.length; w++)
            Mn(e, t, r, h[w], s + "/" + u + "/" + w, a, s, u, n, w);
      } else if (u in Vt.propsKeywords) {
        if (h && typeof h == "object")
          for (var y in h)
            Mn(e, t, r, h[y], s + "/" + u + "/" + sg(y), a, s, u, n, y);
      } else (u in Vt.keywords || e.allKeys && !(u in Vt.skipKeywords)) && Mn(e, t, r, h, s + "/" + u, a, s, u, n);
    }
    r(n, s, a, o, l, c, d);
  }
}
function sg(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
var ag = hu.exports;
Object.defineProperty(Ie, "__esModule", { value: !0 });
Ie.getSchemaRefs = Ie.resolveUrl = Ie.normalizeId = Ie._getFullPath = Ie.getFullPath = Ie.inlineRef = void 0;
const og = L, ig = Zn, cg = ag, lg = /* @__PURE__ */ new Set([
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
function ug(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !ea(e) : t ? mu(e) <= t : !1;
}
Ie.inlineRef = ug;
const dg = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function ea(e) {
  for (const t in e) {
    if (dg.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(ea) || typeof r == "object" && ea(r))
      return !0;
  }
  return !1;
}
function mu(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !lg.has(r) && (typeof e[r] == "object" && (0, og.eachItem)(e[r], (n) => t += mu(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function pu(e, t = "", r) {
  r !== !1 && (t = vr(t));
  const n = e.parse(t);
  return $u(e, n);
}
Ie.getFullPath = pu;
function $u(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
Ie._getFullPath = $u;
const fg = /#\/?$/;
function vr(e) {
  return e ? e.replace(fg, "") : "";
}
Ie.normalizeId = vr;
function hg(e, t, r) {
  return r = vr(r), e.resolve(t, r);
}
Ie.resolveUrl = hg;
const mg = /^[a-z_][-a-z0-9._]*$/i;
function pg(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, s = vr(e[r] || t), a = { "": s }, o = pu(n, s, !1), l = {}, c = /* @__PURE__ */ new Set();
  return cg(e, { allKeys: !0 }, (h, w, y, v) => {
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
        if (!mg.test(R))
          throw new Error(`invalid anchor "${R}"`);
        m.call(this, `#${R}`);
      }
    }
  }), l;
  function d(h, w, y) {
    if (w !== void 0 && !ig(h, w))
      throw u(y);
  }
  function u(h) {
    return new Error(`reference "${h}" resolves to more than one schema`);
  }
}
Ie.getSchemaRefs = pg;
var tc;
function os() {
  if (tc) return $t;
  tc = 1, Object.defineProperty($t, "__esModule", { value: !0 }), $t.getData = $t.KeywordCxt = $t.validateFunctionCode = void 0;
  const e = I0(), t = Ee, r = iu(), n = Ee, s = G0(), a = rg(), o = ng(), l = ne, c = Ft(), d = Ie, u = L, h = as();
  function w(N) {
    if (T(N) && (J(N), O(N))) {
      g(N);
      return;
    }
    y(N, () => (0, e.topBoolOrEmptySchema)(N));
  }
  $t.validateFunctionCode = w;
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
  $t.KeywordCxt = b;
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
  return $t.getData = U, $t;
}
var yn = {}, rc;
function wo() {
  if (rc) return yn;
  rc = 1, Object.defineProperty(yn, "__esModule", { value: !0 });
  class e extends Error {
    constructor(r) {
      super("validation failed"), this.errors = r, this.ajv = this.validation = !0;
    }
  }
  return yn.default = e, yn;
}
var jr = {};
Object.defineProperty(jr, "__esModule", { value: !0 });
const Rs = Ie;
class $g extends Error {
  constructor(t, r, n, s) {
    super(s || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, Rs.resolveUrl)(t, r, n), this.missingSchema = (0, Rs.normalizeId)((0, Rs.getFullPath)(t, this.missingRef));
  }
}
jr.default = $g;
var Ge = {};
Object.defineProperty(Ge, "__esModule", { value: !0 });
Ge.resolveSchema = Ge.getCompilingSchema = Ge.resolveRef = Ge.compileSchema = Ge.SchemaEnv = void 0;
const et = ne, yg = wo(), Ht = Ft(), st = Ie, nc = L, gg = os();
class is {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, st.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
}
Ge.SchemaEnv = is;
function Eo(e) {
  const t = yu.call(this, e);
  if (t)
    return t;
  const r = (0, st.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: s } = this.opts.code, { ownProperties: a } = this.opts, o = new et.CodeGen(this.scope, { es5: n, lines: s, ownProperties: a });
  let l;
  e.$async && (l = o.scopeValue("Error", {
    ref: yg.default,
    code: (0, et._)`require("ajv/dist/runtime/validation_error").default`
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
    dataPathArr: [et.nil],
    // TODO can its length be used as dataLevel if nil is removed?
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: o.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, et.stringify)(e.schema) } : { ref: e.schema }),
    validateName: c,
    ValidationError: l,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: et.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, et._)`""`,
    opts: this.opts,
    self: this
  };
  let u;
  try {
    this._compilations.add(e), (0, gg.validateFunctionCode)(d), o.optimize(this.opts.code.optimize);
    const h = o.toString();
    u = `${o.scopeRefs(Ht.default.scope)}return ${h}`, this.opts.code.process && (u = this.opts.code.process(u, e));
    const y = new Function(`${Ht.default.self}`, `${Ht.default.scope}`, u)(this, this.scope.get());
    if (this.scope.value(c, { ref: y }), y.errors = null, y.schema = e.schema, y.schemaEnv = e, e.$async && (y.$async = !0), this.opts.code.source === !0 && (y.source = { validateName: c, validateCode: h, scopeValues: o._values }), this.opts.unevaluated) {
      const { props: v, items: _ } = d;
      y.evaluated = {
        props: v instanceof et.Name ? void 0 : v,
        items: _ instanceof et.Name ? void 0 : _,
        dynamicProps: v instanceof et.Name,
        dynamicItems: _ instanceof et.Name
      }, y.source && (y.source.evaluated = (0, et.stringify)(y.evaluated));
    }
    return e.validate = y, e;
  } catch (h) {
    throw delete e.validate, delete e.validateName, u && this.logger.error("Error compiling schema, function code:", u), h;
  } finally {
    this._compilations.delete(e);
  }
}
Ge.compileSchema = Eo;
function _g(e, t, r) {
  var n;
  r = (0, st.resolveUrl)(this.opts.uriResolver, t, r);
  const s = e.refs[r];
  if (s)
    return s;
  let a = Eg.call(this, e, r);
  if (a === void 0) {
    const o = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: l } = this.opts;
    o && (a = new is({ schema: o, schemaId: l, root: e, baseId: t }));
  }
  if (a !== void 0)
    return e.refs[r] = vg.call(this, a);
}
Ge.resolveRef = _g;
function vg(e) {
  return (0, st.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : Eo.call(this, e);
}
function yu(e) {
  for (const t of this._compilations)
    if (wg(t, e))
      return t;
}
Ge.getCompilingSchema = yu;
function wg(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function Eg(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || cs.call(this, e, t);
}
function cs(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, st._getFullPath)(this.opts.uriResolver, r);
  let s = (0, st.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === s)
    return Os.call(this, r, e);
  const a = (0, st.normalizeId)(n), o = this.refs[a] || this.schemas[a];
  if (typeof o == "string") {
    const l = cs.call(this, e, o);
    return typeof (l == null ? void 0 : l.schema) != "object" ? void 0 : Os.call(this, r, l);
  }
  if (typeof (o == null ? void 0 : o.schema) == "object") {
    if (o.validate || Eo.call(this, o), a === (0, st.normalizeId)(t)) {
      const { schema: l } = o, { schemaId: c } = this.opts, d = l[c];
      return d && (s = (0, st.resolveUrl)(this.opts.uriResolver, s, d)), new is({ schema: l, schemaId: c, root: e, baseId: s });
    }
    return Os.call(this, r, o);
  }
}
Ge.resolveSchema = cs;
const bg = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function Os(e, { baseId: t, schema: r, root: n }) {
  var s;
  if (((s = e.fragment) === null || s === void 0 ? void 0 : s[0]) !== "/")
    return;
  for (const l of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const c = r[(0, nc.unescapeFragment)(l)];
    if (c === void 0)
      return;
    r = c;
    const d = typeof r == "object" && r[this.opts.schemaId];
    !bg.has(l) && d && (t = (0, st.resolveUrl)(this.opts.uriResolver, t, d));
  }
  let a;
  if (typeof r != "boolean" && r.$ref && !(0, nc.schemaHasRulesButRef)(r, this.RULES)) {
    const l = (0, st.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    a = cs.call(this, n, l);
  }
  const { schemaId: o } = this.opts;
  if (a = a || new is({ schema: r, schemaId: o, root: n, baseId: t }), a.schema !== a.root.schema)
    return a;
}
const Sg = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", Pg = "Meta-schema for $data reference (JSON AnySchema extension proposal)", Ng = "object", Rg = [
  "$data"
], Og = {
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
}, Ig = !1, Tg = {
  $id: Sg,
  description: Pg,
  type: Ng,
  required: Rg,
  properties: Og,
  additionalProperties: Ig
};
var bo = {};
Object.defineProperty(bo, "__esModule", { value: !0 });
const gu = ql;
gu.code = 'require("ajv/dist/runtime/uri").default';
bo.default = gu;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = os();
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
  const n = wo(), s = jr, a = sr, o = Ge, l = ne, c = Ie, d = Ee, u = L, h = Tg, w = bo, y = (P, p) => new RegExp(P, p);
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
    const Ye = P.strict, qt = (p = P.code) === null || p === void 0 ? void 0 : p.optimize, Cr = qt === !0 || qt === void 0 ? 1 : qt || 0, Dr = ($ = (S = P.code) === null || S === void 0 ? void 0 : S.regExp) !== null && $ !== void 0 ? $ : y, ps = (i = P.uriResolver) !== null && i !== void 0 ? i : w.default;
    return {
      strictSchema: (b = (f = P.strictSchema) !== null && f !== void 0 ? f : Ye) !== null && b !== void 0 ? b : !0,
      strictNumbers: (A = (j = P.strictNumbers) !== null && j !== void 0 ? j : Ye) !== null && A !== void 0 ? A : !0,
      strictTypes: (U = (F = P.strictTypes) !== null && F !== void 0 ? F : Ye) !== null && U !== void 0 ? U : "log",
      strictTuples: (I = (N = P.strictTuples) !== null && N !== void 0 ? N : Ye) !== null && I !== void 0 ? I : "log",
      strictRequired: (D = (k = P.strictRequired) !== null && k !== void 0 ? k : Ye) !== null && D !== void 0 ? D : !1,
      code: P.code ? { ...P.code, optimize: Cr, regExp: Dr } : { optimize: Cr, regExp: Dr },
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
      uriResolver: ps
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
})(tu);
var So = {}, Po = {}, No = {};
Object.defineProperty(No, "__esModule", { value: !0 });
const jg = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
No.default = jg;
var ar = {};
Object.defineProperty(ar, "__esModule", { value: !0 });
ar.callRef = ar.getValidate = void 0;
const Ag = jr, sc = oe, Ke = ne, lr = Ft(), ac = Ge, gn = L, kg = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: s, schemaEnv: a, validateName: o, opts: l, self: c } = n, { root: d } = a;
    if ((r === "#" || r === "#/") && s === d.baseId)
      return h();
    const u = ac.resolveRef.call(c, d, s, r);
    if (u === void 0)
      throw new Ag.default(n.opts.uriResolver, s, r);
    if (u instanceof ac.SchemaEnv)
      return w(u);
    return y(u);
    function h() {
      if (a === d)
        return Vn(e, o, a, a.$async);
      const v = t.scopeValue("root", { ref: d });
      return Vn(e, (0, Ke._)`${v}.validate`, d, d.$async);
    }
    function w(v) {
      const _ = _u(e, v);
      Vn(e, _, v, v.$async);
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
function _u(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, Ke._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
ar.getValidate = _u;
function Vn(e, t, r, n) {
  const { gen: s, it: a } = e, { allErrors: o, schemaEnv: l, opts: c } = a, d = c.passContext ? lr.default.this : Ke.nil;
  n ? u() : h();
  function u() {
    if (!l.$async)
      throw new Error("async schema referenced by sync schema");
    const v = s.let("valid");
    s.try(() => {
      s.code((0, Ke._)`await ${(0, sc.callValidateCode)(e, t, d)}`), y(t), o || s.assign(v, !0);
    }, (_) => {
      s.if((0, Ke._)`!(${_} instanceof ${a.ValidationError})`, () => s.throw(_)), w(_), o || s.assign(v, !1);
    }), e.ok(v);
  }
  function h() {
    e.result((0, sc.callValidateCode)(e, t, d), () => y(t), () => w(t));
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
        g.props !== void 0 && (a.props = gn.mergeEvaluated.props(s, g.props, a.props));
      else {
        const m = s.var("props", (0, Ke._)`${v}.evaluated.props`);
        a.props = gn.mergeEvaluated.props(s, m, a.props, Ke.Name);
      }
    if (a.items !== !0)
      if (g && !g.dynamicItems)
        g.items !== void 0 && (a.items = gn.mergeEvaluated.items(s, g.items, a.items));
      else {
        const m = s.var("items", (0, Ke._)`${v}.evaluated.items`);
        a.items = gn.mergeEvaluated.items(s, m, a.items, Ke.Name);
      }
  }
}
ar.callRef = Vn;
ar.default = kg;
Object.defineProperty(Po, "__esModule", { value: !0 });
const Cg = No, Dg = ar, Mg = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  Cg.default,
  Dg.default
];
Po.default = Mg;
var Ro = {}, Oo = {};
Object.defineProperty(Oo, "__esModule", { value: !0 });
const Xn = ne, It = Xn.operators, Jn = {
  maximum: { okStr: "<=", ok: It.LTE, fail: It.GT },
  minimum: { okStr: ">=", ok: It.GTE, fail: It.LT },
  exclusiveMaximum: { okStr: "<", ok: It.LT, fail: It.GTE },
  exclusiveMinimum: { okStr: ">", ok: It.GT, fail: It.LTE }
}, Vg = {
  message: ({ keyword: e, schemaCode: t }) => (0, Xn.str)`must be ${Jn[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, Xn._)`{comparison: ${Jn[e].okStr}, limit: ${t}}`
}, Lg = {
  keyword: Object.keys(Jn),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Vg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, Xn._)`${r} ${Jn[t].fail} ${n} || isNaN(${r})`);
  }
};
Oo.default = Lg;
var Io = {};
Object.defineProperty(Io, "__esModule", { value: !0 });
const Yr = ne, Fg = {
  message: ({ schemaCode: e }) => (0, Yr.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, Yr._)`{multipleOf: ${e}}`
}, zg = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: Fg,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: s } = e, a = s.opts.multipleOfPrecision, o = t.let("res"), l = a ? (0, Yr._)`Math.abs(Math.round(${o}) - ${o}) > 1e-${a}` : (0, Yr._)`${o} !== parseInt(${o})`;
    e.fail$data((0, Yr._)`(${n} === 0 || (${o} = ${r}/${n}, ${l}))`);
  }
};
Io.default = zg;
var To = {}, jo = {};
Object.defineProperty(jo, "__esModule", { value: !0 });
function vu(e) {
  const t = e.length;
  let r = 0, n = 0, s;
  for (; n < t; )
    r++, s = e.charCodeAt(n++), s >= 55296 && s <= 56319 && n < t && (s = e.charCodeAt(n), (s & 64512) === 56320 && n++);
  return r;
}
jo.default = vu;
vu.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(To, "__esModule", { value: !0 });
const Yt = ne, Ug = L, qg = jo, Kg = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, Yt.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, Yt._)`{limit: ${e}}`
}, Gg = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: Kg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: s } = e, a = t === "maxLength" ? Yt.operators.GT : Yt.operators.LT, o = s.opts.unicode === !1 ? (0, Yt._)`${r}.length` : (0, Yt._)`${(0, Ug.useFunc)(e.gen, qg.default)}(${r})`;
    e.fail$data((0, Yt._)`${o} ${a} ${n}`);
  }
};
To.default = Gg;
var Ao = {};
Object.defineProperty(Ao, "__esModule", { value: !0 });
const Hg = oe, Bg = L, $r = ne, Xg = {
  message: ({ schemaCode: e }) => (0, $r.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, $r._)`{pattern: ${e}}`
}, Jg = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Xg,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e, l = o.opts.unicodeRegExp ? "u" : "";
    if (n) {
      const { regExp: c } = o.opts.code, d = c.code === "new RegExp" ? (0, $r._)`new RegExp` : (0, Bg.useFunc)(t, c), u = t.let("valid");
      t.try(() => t.assign(u, (0, $r._)`${d}(${a}, ${l}).test(${r})`), () => t.assign(u, !1)), e.fail$data((0, $r._)`!${u}`);
    } else {
      const c = (0, Hg.usePattern)(e, s);
      e.fail$data((0, $r._)`!${c}.test(${r})`);
    }
  }
};
Ao.default = Jg;
var ko = {};
Object.defineProperty(ko, "__esModule", { value: !0 });
const Qr = ne, Wg = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, Qr.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, Qr._)`{limit: ${e}}`
}, Yg = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Wg,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxProperties" ? Qr.operators.GT : Qr.operators.LT;
    e.fail$data((0, Qr._)`Object.keys(${r}).length ${s} ${n}`);
  }
};
ko.default = Yg;
var Co = {};
Object.defineProperty(Co, "__esModule", { value: !0 });
const Ur = oe, Zr = ne, Qg = L, Zg = {
  message: ({ params: { missingProperty: e } }) => (0, Zr.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, Zr._)`{missingProperty: ${e}}`
}, xg = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Zg,
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
          (0, Qg.checkStrictMode)(o, m, o.opts.strictRequired);
        }
    }
    function d() {
      if (c || a)
        e.block$data(Zr.nil, h);
      else
        for (const y of r)
          (0, Ur.checkReportMissingProp)(e, y);
    }
    function u() {
      const y = t.let("missing");
      if (c || a) {
        const v = t.let("valid", !0);
        e.block$data(v, () => w(y, v)), e.ok(v);
      } else
        t.if((0, Ur.checkMissingProp)(e, r, y)), (0, Ur.reportMissingProp)(e, y), t.else();
    }
    function h() {
      t.forOf("prop", n, (y) => {
        e.setParams({ missingProperty: y }), t.if((0, Ur.noPropertyInData)(t, s, y, l.ownProperties), () => e.error());
      });
    }
    function w(y, v) {
      e.setParams({ missingProperty: y }), t.forOf(y, n, () => {
        t.assign(v, (0, Ur.propertyInData)(t, s, y, l.ownProperties)), t.if((0, Zr.not)(v), () => {
          e.error(), t.break();
        });
      }, Zr.nil);
    }
  }
};
Co.default = xg;
var Do = {};
Object.defineProperty(Do, "__esModule", { value: !0 });
const xr = ne, e_ = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, xr.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, xr._)`{limit: ${e}}`
}, t_ = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: e_,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, s = t === "maxItems" ? xr.operators.GT : xr.operators.LT;
    e.fail$data((0, xr._)`${r}.length ${s} ${n}`);
  }
};
Do.default = t_;
var Mo = {}, an = {};
Object.defineProperty(an, "__esModule", { value: !0 });
const wu = Zn;
wu.code = 'require("ajv/dist/runtime/equal").default';
an.default = wu;
Object.defineProperty(Mo, "__esModule", { value: !0 });
const Is = Ee, Re = ne, r_ = L, n_ = an, s_ = {
  message: ({ params: { i: e, j: t } }) => (0, Re.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, Re._)`{i: ${e}, j: ${t}}`
}, a_ = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: s_,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, parentSchema: a, schemaCode: o, it: l } = e;
    if (!n && !s)
      return;
    const c = t.let("valid"), d = a.items ? (0, Is.getSchemaTypes)(a.items) : [];
    e.block$data(c, u, (0, Re._)`${o} === false`), e.ok(c);
    function u() {
      const v = t.let("i", (0, Re._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: v, j: _ }), t.assign(c, !0), t.if((0, Re._)`${v} > 1`, () => (h() ? w : y)(v, _));
    }
    function h() {
      return d.length > 0 && !d.some((v) => v === "object" || v === "array");
    }
    function w(v, _) {
      const g = t.name("item"), m = (0, Is.checkDataTypes)(d, g, l.opts.strictNumbers, Is.DataType.Wrong), E = t.const("indices", (0, Re._)`{}`);
      t.for((0, Re._)`;${v}--;`, () => {
        t.let(g, (0, Re._)`${r}[${v}]`), t.if(m, (0, Re._)`continue`), d.length > 1 && t.if((0, Re._)`typeof ${g} == "string"`, (0, Re._)`${g} += "_"`), t.if((0, Re._)`typeof ${E}[${g}] == "number"`, () => {
          t.assign(_, (0, Re._)`${E}[${g}]`), e.error(), t.assign(c, !1).break();
        }).code((0, Re._)`${E}[${g}] = ${v}`);
      });
    }
    function y(v, _) {
      const g = (0, r_.useFunc)(t, n_.default), m = t.name("outer");
      t.label(m).for((0, Re._)`;${v}--;`, () => t.for((0, Re._)`${_} = ${v}; ${_}--;`, () => t.if((0, Re._)`${g}(${r}[${v}], ${r}[${_}])`, () => {
        e.error(), t.assign(c, !1).break(m);
      })));
    }
  }
};
Mo.default = a_;
var Vo = {};
Object.defineProperty(Vo, "__esModule", { value: !0 });
const ta = ne, o_ = L, i_ = an, c_ = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, ta._)`{allowedValue: ${e}}`
}, l_ = {
  keyword: "const",
  $data: !0,
  error: c_,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: s, schema: a } = e;
    n || a && typeof a == "object" ? e.fail$data((0, ta._)`!${(0, o_.useFunc)(t, i_.default)}(${r}, ${s})`) : e.fail((0, ta._)`${a} !== ${r}`);
  }
};
Vo.default = l_;
var Lo = {};
Object.defineProperty(Lo, "__esModule", { value: !0 });
const Gr = ne, u_ = L, d_ = an, f_ = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Gr._)`{allowedValues: ${e}}`
}, h_ = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: f_,
  code(e) {
    const { gen: t, data: r, $data: n, schema: s, schemaCode: a, it: o } = e;
    if (!n && s.length === 0)
      throw new Error("enum must have non-empty array");
    const l = s.length >= o.opts.loopEnum;
    let c;
    const d = () => c ?? (c = (0, u_.useFunc)(t, d_.default));
    let u;
    if (l || n)
      u = t.let("valid"), e.block$data(u, h);
    else {
      if (!Array.isArray(s))
        throw new Error("ajv implementation error");
      const y = t.const("vSchema", a);
      u = (0, Gr.or)(...s.map((v, _) => w(y, _)));
    }
    e.pass(u);
    function h() {
      t.assign(u, !1), t.forOf("v", a, (y) => t.if((0, Gr._)`${d()}(${r}, ${y})`, () => t.assign(u, !0).break()));
    }
    function w(y, v) {
      const _ = s[v];
      return typeof _ == "object" && _ !== null ? (0, Gr._)`${d()}(${r}, ${y}[${v}])` : (0, Gr._)`${r} === ${_}`;
    }
  }
};
Lo.default = h_;
Object.defineProperty(Ro, "__esModule", { value: !0 });
const m_ = Oo, p_ = Io, $_ = To, y_ = Ao, g_ = ko, __ = Co, v_ = Do, w_ = Mo, E_ = Vo, b_ = Lo, S_ = [
  // number
  m_.default,
  p_.default,
  // string
  $_.default,
  y_.default,
  // object
  g_.default,
  __.default,
  // array
  v_.default,
  w_.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  E_.default,
  b_.default
];
Ro.default = S_;
var Fo = {}, Ar = {};
Object.defineProperty(Ar, "__esModule", { value: !0 });
Ar.validateAdditionalItems = void 0;
const Qt = ne, ra = L, P_ = {
  message: ({ params: { len: e } }) => (0, Qt.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, Qt._)`{limit: ${e}}`
}, N_ = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: P_,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, ra.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Eu(e, n);
  }
};
function Eu(e, t) {
  const { gen: r, schema: n, data: s, keyword: a, it: o } = e;
  o.items = !0;
  const l = r.const("len", (0, Qt._)`${s}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, Qt._)`${l} <= ${t.length}`);
  else if (typeof n == "object" && !(0, ra.alwaysValidSchema)(o, n)) {
    const d = r.var("valid", (0, Qt._)`${l} <= ${t.length}`);
    r.if((0, Qt.not)(d), () => c(d)), e.ok(d);
  }
  function c(d) {
    r.forRange("i", t.length, l, (u) => {
      e.subschema({ keyword: a, dataProp: u, dataPropType: ra.Type.Num }, d), o.allErrors || r.if((0, Qt.not)(d), () => r.break());
    });
  }
}
Ar.validateAdditionalItems = Eu;
Ar.default = N_;
var zo = {}, kr = {};
Object.defineProperty(kr, "__esModule", { value: !0 });
kr.validateTuple = void 0;
const oc = ne, Ln = L, R_ = oe, O_ = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return bu(e, "additionalItems", t);
    r.items = !0, !(0, Ln.alwaysValidSchema)(r, t) && e.ok((0, R_.validateArray)(e));
  }
};
function bu(e, t, r = e.schema) {
  const { gen: n, parentSchema: s, data: a, keyword: o, it: l } = e;
  u(s), l.opts.unevaluated && r.length && l.items !== !0 && (l.items = Ln.mergeEvaluated.items(n, r.length, l.items));
  const c = n.name("valid"), d = n.const("len", (0, oc._)`${a}.length`);
  r.forEach((h, w) => {
    (0, Ln.alwaysValidSchema)(l, h) || (n.if((0, oc._)`${d} > ${w}`, () => e.subschema({
      keyword: o,
      schemaProp: w,
      dataProp: w
    }, c)), e.ok(c));
  });
  function u(h) {
    const { opts: w, errSchemaPath: y } = l, v = r.length, _ = v === h.minItems && (v === h.maxItems || h[t] === !1);
    if (w.strictTuples && !_) {
      const g = `"${o}" is ${v}-tuple, but minItems or maxItems/${t} are not specified or different at path "${y}"`;
      (0, Ln.checkStrictMode)(l, g, w.strictTuples);
    }
  }
}
kr.validateTuple = bu;
kr.default = O_;
Object.defineProperty(zo, "__esModule", { value: !0 });
const I_ = kr, T_ = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, I_.validateTuple)(e, "items")
};
zo.default = T_;
var Uo = {};
Object.defineProperty(Uo, "__esModule", { value: !0 });
const ic = ne, j_ = L, A_ = oe, k_ = Ar, C_ = {
  message: ({ params: { len: e } }) => (0, ic.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, ic._)`{limit: ${e}}`
}, D_ = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: C_,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: s } = r;
    n.items = !0, !(0, j_.alwaysValidSchema)(n, t) && (s ? (0, k_.validateAdditionalItems)(e, s) : e.ok((0, A_.validateArray)(e)));
  }
};
Uo.default = D_;
var qo = {};
Object.defineProperty(qo, "__esModule", { value: !0 });
const We = ne, _n = L, M_ = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, We.str)`must contain at least ${e} valid item(s)` : (0, We.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, We._)`{minContains: ${e}}` : (0, We._)`{minContains: ${e}, maxContains: ${t}}`
}, V_ = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: M_,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    let o, l;
    const { minContains: c, maxContains: d } = n;
    a.opts.next ? (o = c === void 0 ? 1 : c, l = d) : o = 1;
    const u = t.const("len", (0, We._)`${s}.length`);
    if (e.setParams({ min: o, max: l }), l === void 0 && o === 0) {
      (0, _n.checkStrictMode)(a, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (l !== void 0 && o > l) {
      (0, _n.checkStrictMode)(a, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, _n.alwaysValidSchema)(a, r)) {
      let _ = (0, We._)`${u} >= ${o}`;
      l !== void 0 && (_ = (0, We._)`${_} && ${u} <= ${l}`), e.pass(_);
      return;
    }
    a.items = !0;
    const h = t.name("valid");
    l === void 0 && o === 1 ? y(h, () => t.if(h, () => t.break())) : o === 0 ? (t.let(h, !0), l !== void 0 && t.if((0, We._)`${s}.length > 0`, w)) : (t.let(h, !1), w()), e.result(h, () => e.reset());
    function w() {
      const _ = t.name("_valid"), g = t.let("count", 0);
      y(_, () => t.if(_, () => v(g)));
    }
    function y(_, g) {
      t.forRange("i", 0, u, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: _n.Type.Num,
          compositeRule: !0
        }, _), g();
      });
    }
    function v(_) {
      t.code((0, We._)`${_}++`), l === void 0 ? t.if((0, We._)`${_} >= ${o}`, () => t.assign(h, !0).break()) : (t.if((0, We._)`${_} > ${l}`, () => t.assign(h, !1).break()), o === 1 ? t.assign(h, !0) : t.if((0, We._)`${_} >= ${o}`, () => t.assign(h, !0)));
    }
  }
};
qo.default = V_;
var Su = {};
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
})(Su);
var Ko = {};
Object.defineProperty(Ko, "__esModule", { value: !0 });
const Pu = ne, L_ = L, F_ = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, Pu._)`{propertyName: ${e.propertyName}}`
}, z_ = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: F_,
  code(e) {
    const { gen: t, schema: r, data: n, it: s } = e;
    if ((0, L_.alwaysValidSchema)(s, r))
      return;
    const a = t.name("valid");
    t.forIn("key", n, (o) => {
      e.setParams({ propertyName: o }), e.subschema({
        keyword: "propertyNames",
        data: o,
        dataTypes: ["string"],
        propertyName: o,
        compositeRule: !0
      }, a), t.if((0, Pu.not)(a), () => {
        e.error(!0), s.allErrors || t.break();
      });
    }), e.ok(a);
  }
};
Ko.default = z_;
var ls = {};
Object.defineProperty(ls, "__esModule", { value: !0 });
const vn = oe, rt = ne, U_ = Ft(), wn = L, q_ = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, rt._)`{additionalProperty: ${e.additionalProperty}}`
}, K_ = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: q_,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, errsCount: a, it: o } = e;
    if (!a)
      throw new Error("ajv implementation error");
    const { allErrors: l, opts: c } = o;
    if (o.props = !0, c.removeAdditional !== "all" && (0, wn.alwaysValidSchema)(o, r))
      return;
    const d = (0, vn.allSchemaProperties)(n.properties), u = (0, vn.allSchemaProperties)(n.patternProperties);
    h(), e.ok((0, rt._)`${a} === ${U_.default.errors}`);
    function h() {
      t.forIn("key", s, (g) => {
        !d.length && !u.length ? v(g) : t.if(w(g), () => v(g));
      });
    }
    function w(g) {
      let m;
      if (d.length > 8) {
        const E = (0, wn.schemaRefOrVal)(o, n.properties, "properties");
        m = (0, vn.isOwnProperty)(t, E, g);
      } else d.length ? m = (0, rt.or)(...d.map((E) => (0, rt._)`${g} === ${E}`)) : m = rt.nil;
      return u.length && (m = (0, rt.or)(m, ...u.map((E) => (0, rt._)`${(0, vn.usePattern)(e, E)}.test(${g})`))), (0, rt.not)(m);
    }
    function y(g) {
      t.code((0, rt._)`delete ${s}[${g}]`);
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
      if (typeof r == "object" && !(0, wn.alwaysValidSchema)(o, r)) {
        const m = t.name("valid");
        c.removeAdditional === "failing" ? (_(g, m, !1), t.if((0, rt.not)(m), () => {
          e.reset(), y(g);
        })) : (_(g, m), l || t.if((0, rt.not)(m), () => t.break()));
      }
    }
    function _(g, m, E) {
      const R = {
        keyword: "additionalProperties",
        dataProp: g,
        dataPropType: wn.Type.Str
      };
      E === !1 && Object.assign(R, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(R, m);
    }
  }
};
ls.default = K_;
var Go = {};
Object.defineProperty(Go, "__esModule", { value: !0 });
const G_ = os(), cc = oe, Ts = L, lc = ls, H_ = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: s, it: a } = e;
    a.opts.removeAdditional === "all" && n.additionalProperties === void 0 && lc.default.code(new G_.KeywordCxt(a, lc.default, "additionalProperties"));
    const o = (0, cc.allSchemaProperties)(r);
    for (const h of o)
      a.definedProperties.add(h);
    a.opts.unevaluated && o.length && a.props !== !0 && (a.props = Ts.mergeEvaluated.props(t, (0, Ts.toHash)(o), a.props));
    const l = o.filter((h) => !(0, Ts.alwaysValidSchema)(a, r[h]));
    if (l.length === 0)
      return;
    const c = t.name("valid");
    for (const h of l)
      d(h) ? u(h) : (t.if((0, cc.propertyInData)(t, s, h, a.opts.ownProperties)), u(h), a.allErrors || t.else().var(c, !0), t.endIf()), e.it.definedProperties.add(h), e.ok(c);
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
Go.default = H_;
var Ho = {};
Object.defineProperty(Ho, "__esModule", { value: !0 });
const uc = oe, En = ne, dc = L, fc = L, B_ = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: s, it: a } = e, { opts: o } = a, l = (0, uc.allSchemaProperties)(r), c = l.filter((_) => (0, dc.alwaysValidSchema)(a, r[_]));
    if (l.length === 0 || c.length === l.length && (!a.opts.unevaluated || a.props === !0))
      return;
    const d = o.strictSchema && !o.allowMatchingProperties && s.properties, u = t.name("valid");
    a.props !== !0 && !(a.props instanceof En.Name) && (a.props = (0, fc.evaluatedPropsToName)(t, a.props));
    const { props: h } = a;
    w();
    function w() {
      for (const _ of l)
        d && y(_), a.allErrors ? v(_) : (t.var(u, !0), v(_), t.if(u));
    }
    function y(_) {
      for (const g in d)
        new RegExp(_).test(g) && (0, dc.checkStrictMode)(a, `property ${g} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function v(_) {
      t.forIn("key", n, (g) => {
        t.if((0, En._)`${(0, uc.usePattern)(e, _)}.test(${g})`, () => {
          const m = c.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: g,
            dataPropType: fc.Type.Str
          }, u), a.opts.unevaluated && h !== !0 ? t.assign((0, En._)`${h}[${g}]`, !0) : !m && !a.allErrors && t.if((0, En.not)(u), () => t.break());
        });
      });
    }
  }
};
Ho.default = B_;
var Bo = {};
Object.defineProperty(Bo, "__esModule", { value: !0 });
const X_ = L, J_ = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, X_.alwaysValidSchema)(n, r)) {
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
Bo.default = J_;
var Xo = {};
Object.defineProperty(Xo, "__esModule", { value: !0 });
const W_ = oe, Y_ = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: W_.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
Xo.default = Y_;
var Jo = {};
Object.defineProperty(Jo, "__esModule", { value: !0 });
const Fn = ne, Q_ = L, Z_ = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, Fn._)`{passingSchemas: ${e.passing}}`
}, x_ = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Z_,
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
        (0, Q_.alwaysValidSchema)(s, u) ? t.var(c, !0) : w = e.subschema({
          keyword: "oneOf",
          schemaProp: h,
          compositeRule: !0
        }, c), h > 0 && t.if((0, Fn._)`${c} && ${o}`).assign(o, !1).assign(l, (0, Fn._)`[${l}, ${h}]`).else(), t.if(c, () => {
          t.assign(o, !0), t.assign(l, h), w && e.mergeEvaluated(w, Fn.Name);
        });
      });
    }
  }
};
Jo.default = x_;
var Wo = {};
Object.defineProperty(Wo, "__esModule", { value: !0 });
const ev = L, tv = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const s = t.name("valid");
    r.forEach((a, o) => {
      if ((0, ev.alwaysValidSchema)(n, a))
        return;
      const l = e.subschema({ keyword: "allOf", schemaProp: o }, s);
      e.ok(s), e.mergeEvaluated(l);
    });
  }
};
Wo.default = tv;
var Yo = {};
Object.defineProperty(Yo, "__esModule", { value: !0 });
const Wn = ne, Nu = L, rv = {
  message: ({ params: e }) => (0, Wn.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, Wn._)`{failingKeyword: ${e.ifClause}}`
}, nv = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: rv,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Nu.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const s = hc(n, "then"), a = hc(n, "else");
    if (!s && !a)
      return;
    const o = t.let("valid", !0), l = t.name("_valid");
    if (c(), e.reset(), s && a) {
      const u = t.let("ifClause");
      e.setParams({ ifClause: u }), t.if(l, d("then", u), d("else", u));
    } else s ? t.if(l, d("then")) : t.if((0, Wn.not)(l), d("else"));
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
        t.assign(o, l), e.mergeValidEvaluated(w, o), h ? t.assign(h, (0, Wn._)`${u}`) : e.setParams({ ifClause: u });
      };
    }
  }
};
function hc(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Nu.alwaysValidSchema)(e, r);
}
Yo.default = nv;
var Qo = {};
Object.defineProperty(Qo, "__esModule", { value: !0 });
const sv = L, av = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, sv.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
Qo.default = av;
Object.defineProperty(Fo, "__esModule", { value: !0 });
const ov = Ar, iv = zo, cv = kr, lv = Uo, uv = qo, dv = Su, fv = Ko, hv = ls, mv = Go, pv = Ho, $v = Bo, yv = Xo, gv = Jo, _v = Wo, vv = Yo, wv = Qo;
function Ev(e = !1) {
  const t = [
    // any
    $v.default,
    yv.default,
    gv.default,
    _v.default,
    vv.default,
    wv.default,
    // object
    fv.default,
    hv.default,
    dv.default,
    mv.default,
    pv.default
  ];
  return e ? t.push(iv.default, lv.default) : t.push(ov.default, cv.default), t.push(uv.default), t;
}
Fo.default = Ev;
var Zo = {}, xo = {};
Object.defineProperty(xo, "__esModule", { value: !0 });
const _e = ne, bv = {
  message: ({ schemaCode: e }) => (0, _e.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, _e._)`{format: ${e}}`
}, Sv = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: bv,
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
xo.default = Sv;
Object.defineProperty(Zo, "__esModule", { value: !0 });
const Pv = xo, Nv = [Pv.default];
Zo.default = Nv;
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
Object.defineProperty(So, "__esModule", { value: !0 });
const Rv = Po, Ov = Ro, Iv = Fo, Tv = Zo, mc = Pr, jv = [
  Rv.default,
  Ov.default,
  (0, Iv.default)(),
  Tv.default,
  mc.metadataVocabulary,
  mc.contentVocabulary
];
So.default = jv;
var ei = {}, us = {};
Object.defineProperty(us, "__esModule", { value: !0 });
us.DiscrError = void 0;
var pc;
(function(e) {
  e.Tag = "tag", e.Mapping = "mapping";
})(pc || (us.DiscrError = pc = {}));
Object.defineProperty(ei, "__esModule", { value: !0 });
const fr = ne, na = us, $c = Ge, Av = jr, kv = L, Cv = {
  message: ({ params: { discrError: e, tagName: t } }) => e === na.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, fr._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, Dv = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: Cv,
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
    t.if((0, fr._)`typeof ${d} == "string"`, () => u(), () => e.error(!1, { discrError: na.DiscrError.Tag, tag: d, tagName: l })), e.ok(c);
    function u() {
      const y = w();
      t.if(!1);
      for (const v in y)
        t.elseIf((0, fr._)`${d} === ${v}`), t.assign(c, h(y[v]));
      t.else(), e.error(!1, { discrError: na.DiscrError.Mapping, tag: d, tagName: l }), t.endIf();
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
        if (T != null && T.$ref && !(0, kv.schemaHasRulesButRef)(T, a.self.RULES)) {
          const J = T.$ref;
          if (T = $c.resolveRef.call(a.self, a.schemaEnv.root, a.baseId, J), T instanceof $c.SchemaEnv && (T = T.schema), T === void 0)
            throw new Av.default(a.opts.uriResolver, a.baseId, J);
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
ei.default = Dv;
const Mv = "http://json-schema.org/draft-07/schema#", Vv = "http://json-schema.org/draft-07/schema#", Lv = "Core schema meta-schema", Fv = {
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
}, zv = [
  "object",
  "boolean"
], Uv = {
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
}, qv = {
  $schema: Mv,
  $id: Vv,
  title: Lv,
  definitions: Fv,
  type: zv,
  properties: Uv,
  default: !0
};
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = t.Ajv = void 0;
  const r = tu, n = So, s = ei, a = qv, o = ["/properties"], l = "http://json-schema.org/draft-07/schema";
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
  var d = os();
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
  var h = wo();
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return h.default;
  } });
  var w = jr;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return w.default;
  } });
})(Ys, Ys.exports);
var Kv = Ys.exports;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatLimitDefinition = void 0;
  const t = Kv, r = ne, n = r.operators, s = {
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
})(eu);
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 });
  const r = xl, n = eu, s = ne, a = new s.Name("fullFormats"), o = new s.Name("fastFormats"), l = (d, u = { keywords: !0 }) => {
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
})(Ws, Ws.exports);
var Gv = Ws.exports;
const Hv = /* @__PURE__ */ Wc(Gv), Bv = (e, t, r, n) => {
  if (r === "length" || r === "prototype" || r === "arguments" || r === "caller")
    return;
  const s = Object.getOwnPropertyDescriptor(e, r), a = Object.getOwnPropertyDescriptor(t, r);
  !Xv(s, a) && n || Object.defineProperty(e, r, a);
}, Xv = function(e, t) {
  return e === void 0 || e.configurable || e.writable === t.writable && e.enumerable === t.enumerable && e.configurable === t.configurable && (e.writable || e.value === t.value);
}, Jv = (e, t) => {
  const r = Object.getPrototypeOf(t);
  r !== Object.getPrototypeOf(e) && Object.setPrototypeOf(e, r);
}, Wv = (e, t) => `/* Wrapped ${e}*/
${t}`, Yv = Object.getOwnPropertyDescriptor(Function.prototype, "toString"), Qv = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"), Zv = (e, t, r) => {
  const n = r === "" ? "" : `with ${r.trim()}() `, s = Wv.bind(null, n, t.toString());
  Object.defineProperty(s, "name", Qv);
  const { writable: a, enumerable: o, configurable: l } = Yv;
  Object.defineProperty(e, "toString", { value: s, writable: a, enumerable: o, configurable: l });
};
function xv(e, t, { ignoreNonConfigurable: r = !1 } = {}) {
  const { name: n } = e;
  for (const s of Reflect.ownKeys(t))
    Bv(e, t, s, r);
  return Jv(e, t), Zv(e, t, n), e;
}
const yc = (e, t = {}) => {
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
  return xv(d, e), d.cancel = () => {
    o && (clearTimeout(o), o = void 0), l && (clearTimeout(l), l = void 0);
  }, d;
};
var sa = { exports: {} };
const ew = "2.0.0", Ru = 256, tw = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
9007199254740991, rw = 16, nw = Ru - 6, sw = [
  "major",
  "premajor",
  "minor",
  "preminor",
  "patch",
  "prepatch",
  "prerelease"
];
var on = {
  MAX_LENGTH: Ru,
  MAX_SAFE_COMPONENT_LENGTH: rw,
  MAX_SAFE_BUILD_LENGTH: nw,
  MAX_SAFE_INTEGER: tw,
  RELEASE_TYPES: sw,
  SEMVER_SPEC_VERSION: ew,
  FLAG_INCLUDE_PRERELEASE: 1,
  FLAG_LOOSE: 2
};
const aw = typeof process == "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...e) => console.error("SEMVER", ...e) : () => {
};
var ds = aw;
(function(e, t) {
  const {
    MAX_SAFE_COMPONENT_LENGTH: r,
    MAX_SAFE_BUILD_LENGTH: n,
    MAX_LENGTH: s
  } = on, a = ds;
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
})(sa, sa.exports);
var cn = sa.exports;
const ow = Object.freeze({ loose: !0 }), iw = Object.freeze({}), cw = (e) => e ? typeof e != "object" ? ow : e : iw;
var ti = cw;
const gc = /^[0-9]+$/, Ou = (e, t) => {
  if (typeof e == "number" && typeof t == "number")
    return e === t ? 0 : e < t ? -1 : 1;
  const r = gc.test(e), n = gc.test(t);
  return r && n && (e = +e, t = +t), e === t ? 0 : r && !n ? -1 : n && !r ? 1 : e < t ? -1 : 1;
}, lw = (e, t) => Ou(t, e);
var Iu = {
  compareIdentifiers: Ou,
  rcompareIdentifiers: lw
};
const bn = ds, { MAX_LENGTH: _c, MAX_SAFE_INTEGER: Sn } = on, { safeRe: Pn, t: Nn } = cn, uw = ti, { compareIdentifiers: aa } = Iu, dw = (e, t) => {
  const r = t.split(".");
  if (r.length > e.length)
    return !1;
  for (let n = 0; n < r.length; n++)
    if (aa(e[n], r[n]) !== 0)
      return !1;
  return !0;
};
let fw = class lt {
  constructor(t, r) {
    if (r = uw(r), t instanceof lt) {
      if (t.loose === !!r.loose && t.includePrerelease === !!r.includePrerelease)
        return t;
      t = t.version;
    } else if (typeof t != "string")
      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof t}".`);
    if (t.length > _c)
      throw new TypeError(
        `version is longer than ${_c} characters`
      );
    bn("SemVer", t, r), this.options = r, this.loose = !!r.loose, this.includePrerelease = !!r.includePrerelease;
    const n = t.trim().match(r.loose ? Pn[Nn.LOOSE] : Pn[Nn.FULL]);
    if (!n)
      throw new TypeError(`Invalid Version: ${t}`);
    if (this.raw = t, this.major = +n[1], this.minor = +n[2], this.patch = +n[3], this.major > Sn || this.major < 0)
      throw new TypeError("Invalid major version");
    if (this.minor > Sn || this.minor < 0)
      throw new TypeError("Invalid minor version");
    if (this.patch > Sn || this.patch < 0)
      throw new TypeError("Invalid patch version");
    n[4] ? this.prerelease = n[4].split(".").map((s) => {
      if (/^[0-9]+$/.test(s)) {
        const a = +s;
        if (a >= 0 && a < Sn)
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
    if (bn("SemVer.compare", this.version, this.options, t), !(t instanceof lt)) {
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
      if (bn("prerelease compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return aa(n, s);
    } while (++r);
  }
  compareBuild(t) {
    t instanceof lt || (t = new lt(t, this.options));
    let r = 0;
    do {
      const n = this.build[r], s = t.build[r];
      if (bn("build compare", r, n, s), n === void 0 && s === void 0)
        return 0;
      if (s === void 0)
        return 1;
      if (n === void 0)
        return -1;
      if (n === s)
        continue;
      return aa(n, s);
    } while (++r);
  }
  // preminor will bump the version up to the next minor release, and immediately
  // down to pre-release. premajor and prepatch work the same way.
  inc(t, r, n) {
    if (t.startsWith("pre")) {
      if (!r && n === !1)
        throw new Error("invalid increment argument: identifier is empty");
      if (r) {
        const s = `-${r}`.match(this.options.loose ? Pn[Nn.PRERELEASELOOSE] : Pn[Nn.PRERELEASE]);
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
          if (n === !1 && (a = [r]), dw(this.prerelease, r)) {
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
var Me = fw;
const vc = Me, hw = (e, t, r = !1) => {
  if (e instanceof vc)
    return e;
  try {
    return new vc(e, t);
  } catch (n) {
    if (!r)
      return null;
    throw n;
  }
};
var or = hw;
const mw = or, pw = (e, t) => {
  const r = mw(e, t);
  return r ? r.version : null;
};
var $w = pw;
const yw = or, gw = (e, t) => {
  const r = yw(e.trim().replace(/^[=v]+/, ""), t);
  return r ? r.version : null;
};
var _w = gw;
const wc = Me, vw = (e, t, r, n, s) => {
  typeof r == "string" && (s = n, n = r, r = void 0);
  try {
    return new wc(
      e instanceof wc ? e.version : e,
      r
    ).inc(t, n, s).version;
  } catch {
    return null;
  }
};
var ww = vw;
const Ec = or, Ew = (e, t) => {
  const r = Ec(e, null, !0), n = Ec(t, null, !0), s = r.compare(n);
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
var bw = Ew;
const Sw = Me, Pw = (e, t) => new Sw(e, t).major;
var Nw = Pw;
const Rw = Me, Ow = (e, t) => new Rw(e, t).minor;
var Iw = Ow;
const Tw = Me, jw = (e, t) => new Tw(e, t).patch;
var Aw = jw;
const kw = or, Cw = (e, t) => {
  const r = kw(e, t);
  return r && r.prerelease.length ? r.prerelease : null;
};
var Dw = Cw;
const bc = Me, Mw = (e, t, r) => new bc(e, r).compare(new bc(t, r));
var ot = Mw;
const Vw = ot, Lw = (e, t, r) => Vw(t, e, r);
var Fw = Lw;
const zw = ot, Uw = (e, t) => zw(e, t, !0);
var qw = Uw;
const Sc = Me, Kw = (e, t, r) => {
  const n = new Sc(e, r), s = new Sc(t, r);
  return n.compare(s) || n.compareBuild(s);
};
var ri = Kw;
const Gw = ri, Hw = (e, t) => e.sort((r, n) => Gw(r, n, t));
var Bw = Hw;
const Xw = ri, Jw = (e, t) => e.sort((r, n) => Xw(n, r, t));
var Ww = Jw;
const Yw = ot, Qw = (e, t, r) => Yw(e, t, r) > 0;
var fs = Qw;
const Zw = ot, xw = (e, t, r) => Zw(e, t, r) < 0;
var ni = xw;
const eE = ot, tE = (e, t, r) => eE(e, t, r) === 0;
var Tu = tE;
const rE = ot, nE = (e, t, r) => rE(e, t, r) !== 0;
var ju = nE;
const sE = ot, aE = (e, t, r) => sE(e, t, r) >= 0;
var si = aE;
const oE = ot, iE = (e, t, r) => oE(e, t, r) <= 0;
var ai = iE;
const cE = Tu, lE = ju, uE = fs, dE = si, fE = ni, hE = ai, mE = (e, t, r, n) => {
  switch (t) {
    case "===":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e === r;
    case "!==":
      return typeof e == "object" && (e = e.version), typeof r == "object" && (r = r.version), e !== r;
    case "":
    case "=":
    case "==":
      return cE(e, r, n);
    case "!=":
      return lE(e, r, n);
    case ">":
      return uE(e, r, n);
    case ">=":
      return dE(e, r, n);
    case "<":
      return fE(e, r, n);
    case "<=":
      return hE(e, r, n);
    default:
      throw new TypeError(`Invalid operator: ${t}`);
  }
};
var Au = mE;
const pE = Me, $E = or, { safeRe: Rn, t: On } = cn, yE = (e, t) => {
  if (e instanceof pE)
    return e;
  if (typeof e == "number" && (e = String(e)), typeof e != "string")
    return null;
  t = t || {};
  let r = null;
  if (!t.rtl)
    r = e.match(t.includePrerelease ? Rn[On.COERCEFULL] : Rn[On.COERCE]);
  else {
    const c = t.includePrerelease ? Rn[On.COERCERTLFULL] : Rn[On.COERCERTL];
    let d;
    for (; (d = c.exec(e)) && (!r || r.index + r[0].length !== e.length); )
      (!r || d.index + d[0].length !== r.index + r[0].length) && (r = d), c.lastIndex = d.index + d[1].length + d[2].length;
    c.lastIndex = -1;
  }
  if (r === null)
    return null;
  const n = r[2], s = r[3] || "0", a = r[4] || "0", o = t.includePrerelease && r[5] ? `-${r[5]}` : "", l = t.includePrerelease && r[6] ? `+${r[6]}` : "";
  return $E(`${n}.${s}.${a}${o}${l}`, t);
};
var gE = yE;
const _E = or, vE = on, wE = Me, EE = (e, t, r) => {
  if (!vE.RELEASE_TYPES.includes(t))
    return null;
  const n = bE(e, r);
  return n && SE(n, t);
}, bE = (e, t) => {
  const r = e instanceof wE ? e.version : e;
  return _E(r, t);
}, SE = (e, t) => {
  if (PE(t))
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
}, PE = (e) => e.startsWith("pre");
var NE = EE;
class RE {
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
var OE = RE, js, Pc;
function it() {
  if (Pc) return js;
  Pc = 1;
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
  js = t;
  const r = OE, n = new r(), s = ti, a = hs(), o = ds, l = Me, {
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
  return js;
}
var As, Nc;
function hs() {
  if (Nc) return As;
  Nc = 1;
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
  As = t;
  const r = ti, { safeRe: n, t: s } = cn, a = Au, o = ds, l = Me, c = it();
  return As;
}
const IE = it(), TE = (e, t, r) => {
  try {
    t = new IE(t, r);
  } catch {
    return !1;
  }
  return t.test(e);
};
var ms = TE;
const jE = it(), AE = (e, t) => new jE(e, t).set.map((r) => r.map((n) => n.value).join(" ").trim().split(" "));
var kE = AE;
const CE = Me, DE = it(), ME = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new DE(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === -1) && (n = o, s = new CE(n, r));
  }), n;
};
var VE = ME;
const LE = Me, FE = it(), zE = (e, t, r) => {
  let n = null, s = null, a = null;
  try {
    a = new FE(t, r);
  } catch {
    return null;
  }
  return e.forEach((o) => {
    a.test(o) && (!n || s.compare(o) === 1) && (n = o, s = new LE(n, r));
  }), n;
};
var UE = zE;
const ks = Me, qE = it(), Rc = fs, KE = (e, t) => {
  e = new qE(e, t);
  let r = new ks("0.0.0");
  if (e.test(r) || (r = new ks("0.0.0-0"), e.test(r)))
    return r;
  r = null;
  for (let n = 0; n < e.set.length; ++n) {
    const s = e.set[n];
    let a = null;
    s.forEach((o) => {
      const l = new ks(o.semver.version);
      switch (o.operator) {
        case ">":
          l.prerelease.length === 0 ? l.patch++ : l.prerelease.push(0), l.raw = l.format();
        case "":
        case ">=":
          (!a || Rc(l, a)) && (a = l);
          break;
        case "<":
        case "<=":
          break;
        default:
          throw new Error(`Unexpected operation: ${o.operator}`);
      }
    }), a && (!r || Rc(r, a)) && (r = a);
  }
  return r && e.test(r) ? r : null;
};
var GE = KE;
const HE = it(), BE = (e, t) => {
  try {
    return new HE(e, t).range || "*";
  } catch {
    return null;
  }
};
var XE = BE;
const JE = Me, ku = hs(), { ANY: WE } = ku, YE = it(), QE = ms, Oc = fs, Ic = ni, ZE = ai, xE = si, eb = (e, t, r, n) => {
  e = new JE(e, n), t = new YE(t, n);
  let s, a, o, l, c;
  switch (r) {
    case ">":
      s = Oc, a = ZE, o = Ic, l = ">", c = ">=";
      break;
    case "<":
      s = Ic, a = xE, o = Oc, l = "<", c = "<=";
      break;
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"');
  }
  if (QE(e, t, n))
    return !1;
  for (let d = 0; d < t.set.length; ++d) {
    const u = t.set[d];
    let h = null, w = null;
    if (u.forEach((y) => {
      y.semver === WE && (y = new ku(">=0.0.0")), h = h || y, w = w || y, s(y.semver, h.semver, n) ? h = y : o(y.semver, w.semver, n) && (w = y);
    }), h.operator === l || h.operator === c || (!w.operator || w.operator === l) && a(e, w.semver))
      return !1;
    if (w.operator === c && o(e, w.semver))
      return !1;
  }
  return !0;
};
var oi = eb;
const tb = oi, rb = (e, t, r) => tb(e, t, ">", r);
var nb = rb;
const sb = oi, ab = (e, t, r) => sb(e, t, "<", r);
var ob = ab;
const Tc = it(), ib = (e, t, r) => (e = new Tc(e, r), t = new Tc(t, r), e.intersects(t, r));
var cb = ib;
const lb = ms, ub = ot;
var db = (e, t, r) => {
  const n = [];
  let s = null, a = null;
  const o = e.sort((u, h) => ub(u, h, r));
  for (const u of o)
    lb(u, t, r) ? (a = u, s || (s = u)) : (a && n.push([s, a]), a = null, s = null);
  s && n.push([s, null]);
  const l = [];
  for (const [u, h] of n)
    u === h ? l.push(u) : !h && u === o[0] ? l.push("*") : h ? u === o[0] ? l.push(`<=${h}`) : l.push(`${u} - ${h}`) : l.push(`>=${u}`);
  const c = l.join(" || "), d = typeof t.raw == "string" ? t.raw : String(t);
  return c.length < d.length ? c : t;
};
const jc = it(), ii = hs(), { ANY: Cs } = ii, Ds = ms, ci = ot, fb = (e, t, r = {}) => {
  if (e === t)
    return !0;
  e = new jc(e, r), t = new jc(t, r);
  let n = !1;
  e: for (const s of e.set) {
    for (const a of t.set) {
      const o = mb(s, a, r);
      if (n = n || o !== null, o)
        continue e;
    }
    if (n)
      return !1;
  }
  return !0;
}, hb = [new ii(">=0.0.0-0")], Ac = [new ii(">=0.0.0")], mb = (e, t, r) => {
  if (e === t)
    return !0;
  if (e.length === 1 && e[0].semver === Cs) {
    if (t.length === 1 && t[0].semver === Cs)
      return !0;
    r.includePrerelease ? e = hb : e = Ac;
  }
  if (t.length === 1 && t[0].semver === Cs) {
    if (r.includePrerelease)
      return !0;
    t = Ac;
  }
  const n = /* @__PURE__ */ new Set();
  let s, a;
  for (const y of e)
    y.operator === ">" || y.operator === ">=" ? s = kc(s, y, r) : y.operator === "<" || y.operator === "<=" ? a = Cc(a, y, r) : n.add(y.semver);
  if (n.size > 1)
    return null;
  let o;
  if (s && a) {
    if (o = ci(s.semver, a.semver, r), o > 0)
      return null;
    if (o === 0 && (s.operator !== ">=" || a.operator !== "<="))
      return null;
  }
  for (const y of n) {
    if (s && !Ds(y, String(s), r) || a && !Ds(y, String(a), r))
      return null;
    for (const v of t)
      if (!Ds(y, String(v), r))
        return !1;
    return !0;
  }
  let l, c, d, u, h = a && !r.includePrerelease && a.semver.prerelease.length ? a.semver : !1, w = s && !r.includePrerelease && s.semver.prerelease.length ? s.semver : !1;
  h && h.prerelease.length === 1 && a.operator === "<" && h.prerelease[0] === 0 && (h = !1);
  for (const y of t) {
    if (u = u || y.operator === ">" || y.operator === ">=", d = d || y.operator === "<" || y.operator === "<=", s) {
      if (w && y.semver.prerelease && y.semver.prerelease.length && y.semver.major === w.major && y.semver.minor === w.minor && y.semver.patch === w.patch && (w = !1), y.operator === ">" || y.operator === ">=") {
        if (l = kc(s, y, r), l === y && l !== s)
          return !1;
      } else if (s.operator === ">=" && !y.test(s.semver))
        return !1;
    }
    if (a) {
      if (h && y.semver.prerelease && y.semver.prerelease.length && y.semver.major === h.major && y.semver.minor === h.minor && y.semver.patch === h.patch && (h = !1), y.operator === "<" || y.operator === "<=") {
        if (c = Cc(a, y, r), c === y && c !== a)
          return !1;
      } else if (a.operator === "<=" && !y.test(a.semver))
        return !1;
    }
    if (!y.operator && (a || s) && o !== 0)
      return !1;
  }
  return !(s && d && !a && o !== 0 || a && u && !s && o !== 0 || w || h);
}, kc = (e, t, r) => {
  if (!e)
    return t;
  const n = ci(e.semver, t.semver, r);
  return n > 0 ? e : n < 0 || t.operator === ">" && e.operator === ">=" ? t : e;
}, Cc = (e, t, r) => {
  if (!e)
    return t;
  const n = ci(e.semver, t.semver, r);
  return n < 0 ? e : n > 0 || t.operator === "<" && e.operator === "<=" ? t : e;
};
var pb = fb;
const Ms = cn, Dc = on, $b = Me, Mc = Iu, yb = or, gb = $w, _b = _w, vb = ww, wb = bw, Eb = Nw, bb = Iw, Sb = Aw, Pb = Dw, Nb = ot, Rb = Fw, Ob = qw, Ib = ri, Tb = Bw, jb = Ww, Ab = fs, kb = ni, Cb = Tu, Db = ju, Mb = si, Vb = ai, Lb = Au, Fb = gE, zb = NE, Ub = hs(), qb = it(), Kb = ms, Gb = kE, Hb = VE, Bb = UE, Xb = GE, Jb = XE, Wb = oi, Yb = nb, Qb = ob, Zb = cb, xb = db, eS = pb;
var tS = {
  parse: yb,
  valid: gb,
  clean: _b,
  inc: vb,
  diff: wb,
  major: Eb,
  minor: bb,
  patch: Sb,
  prerelease: Pb,
  compare: Nb,
  rcompare: Rb,
  compareLoose: Ob,
  compareBuild: Ib,
  sort: Tb,
  rsort: jb,
  gt: Ab,
  lt: kb,
  eq: Cb,
  neq: Db,
  gte: Mb,
  lte: Vb,
  cmp: Lb,
  coerce: Fb,
  truncate: zb,
  Comparator: Ub,
  Range: qb,
  satisfies: Kb,
  toComparators: Gb,
  maxSatisfying: Hb,
  minSatisfying: Bb,
  minVersion: Xb,
  validRange: Jb,
  outside: Wb,
  gtr: Yb,
  ltr: Qb,
  intersects: Zb,
  simplifyRange: xb,
  subset: eS,
  SemVer: $b,
  re: Ms.re,
  src: Ms.src,
  tokens: Ms.t,
  SEMVER_SPEC_VERSION: Dc.SEMVER_SPEC_VERSION,
  RELEASE_TYPES: Dc.RELEASE_TYPES,
  compareIdentifiers: Mc.compareIdentifiers,
  rcompareIdentifiers: Mc.rcompareIdentifiers
};
const ur = /* @__PURE__ */ Wc(tS), rS = Object.prototype.toString, nS = "[object Uint8Array]", sS = "[object ArrayBuffer]";
function Cu(e, t, r) {
  return e ? e.constructor === t ? !0 : rS.call(e) === r : !1;
}
function Du(e) {
  return Cu(e, Uint8Array, nS);
}
function aS(e) {
  return Cu(e, ArrayBuffer, sS);
}
function oS(e) {
  return Du(e) || aS(e);
}
function iS(e) {
  if (!Du(e))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof e}\``);
}
function cS(e) {
  if (!oS(e))
    throw new TypeError(`Expected \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
}
function Vs(e, t) {
  if (e.length === 0)
    return new Uint8Array(0);
  t ?? (t = e.reduce((s, a) => s + a.length, 0));
  const r = new Uint8Array(t);
  let n = 0;
  for (const s of e)
    iS(s), r.set(s, n), n += s.length;
  return r;
}
const In = {
  utf8: new globalThis.TextDecoder("utf8")
};
function Tn(e, t = "utf8") {
  return cS(e), In[t] ?? (In[t] = new globalThis.TextDecoder(t)), In[t].decode(e);
}
function lS(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected \`string\`, got \`${typeof e}\``);
}
const uS = new globalThis.TextEncoder();
function Ls(e) {
  return lS(e), uS.encode(e);
}
Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
const Vc = "aes-256-cbc", Mu = /* @__PURE__ */ new Set([
  "aes-256-cbc",
  "aes-256-gcm",
  "aes-256-ctr"
]), dS = (e) => typeof e == "string" && Mu.has(e), _t = () => /* @__PURE__ */ Object.create(null), Lc = (e) => e !== void 0, Fs = (e, t) => {
  const r = /* @__PURE__ */ new Set([
    "undefined",
    "symbol",
    "function"
  ]), n = typeof t;
  if (r.has(n))
    throw new TypeError(`Setting a value of type \`${n}\` for key \`${e}\` is not allowed as it's not supported by JSON`);
}, jt = "__internal__", zs = `${jt}.migrations.version`;
var Ct, Dt, Zt, Ue, Xe, xt, er, wr, ut, Pe, Vu, Lu, Fu, zu, Uu, qu, Ku, Gu;
class fS {
  constructor(t = {}) {
    Qe(this, Pe);
    Mr(this, "path");
    Mr(this, "events");
    Qe(this, Ct);
    Qe(this, Dt);
    Qe(this, Zt);
    Qe(this, Ue);
    Qe(this, Xe, {});
    Qe(this, xt, !1);
    Qe(this, er);
    Qe(this, wr);
    Qe(this, ut);
    Mr(this, "_deserialize", (t) => JSON.parse(t));
    Mr(this, "_serialize", (t) => JSON.stringify(t, void 0, "	"));
    const r = mt(this, Pe, Vu).call(this, t);
    ze(this, Ue, r), mt(this, Pe, Lu).call(this, r), mt(this, Pe, zu).call(this, r), mt(this, Pe, Uu).call(this, r), this.events = new EventTarget(), ze(this, Dt, r.encryptionKey), ze(this, Zt, r.encryptionAlgorithm ?? Vc), this.path = mt(this, Pe, qu).call(this, r), mt(this, Pe, Ku).call(this, r), r.watch && this._watch();
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
      throw new TypeError(`Please don't use the ${jt} key, as it's used to manage this module internal operations.`);
    const { store: n } = this, s = (a, o) => {
      if (Fs(a, o), Z(this, Ue).accessPropertiesByDotNotation)
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
    return Z(this, Ue).accessPropertiesByDotNotation ? gs(this.store, t) : t in this.store;
  }
  appendToArray(t, r) {
    Fs(t, r);
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
      Lc(Z(this, Xe)[r]) && this.set(r, Z(this, Xe)[r]);
  }
  delete(t) {
    const { store: r } = this;
    Z(this, Ue).accessPropertiesByDotNotation ? xu(r, t) : delete r[t], this.store = r;
  }
  /**
      Delete all items.
  
      This resets known items to their default values, if defined by the `defaults` or `schema` option.
      */
  clear() {
    const t = _t();
    for (const r of Object.keys(Z(this, Xe)))
      Lc(Z(this, Xe)[r]) && (Fs(r, Z(this, Xe)[r]), Z(this, Ue).accessPropertiesByDotNotation ? ln(t, r, Z(this, Xe)[r]) : t[r] = Z(this, Xe)[r]);
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
      const r = x.readFileSync(this.path, Z(this, Dt) ? null : "utf8"), n = this._decryptData(r);
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
    if (this._ensureDirectory(), !gs(t, jt))
      try {
        const r = x.readFileSync(this.path, Z(this, Dt) ? null : "utf8"), n = this._decryptData(r), s = this._deserialize(n);
        gs(s, jt) && ln(t, jt, fi(s, jt));
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
    const r = Z(this, Dt);
    if (!r)
      return typeof t == "string" ? t : Tn(t);
    const n = Z(this, Zt), s = n === "aes-256-gcm" ? 16 : 0, a = ":".codePointAt(0), o = typeof t == "string" ? t.codePointAt(16) : t[16];
    if (!(a !== void 0 && o === a)) {
      if (n === "aes-256-cbc")
        return typeof t == "string" ? t : Tn(t);
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
    }, d = t.slice(0, 16), u = t.slice(17), h = typeof u == "string" ? Ls(u) : u, w = (y) => {
      const { ciphertext: v, authenticationTag: _ } = c(h), g = Vr.pbkdf2Sync(r, y, 1e4, 32, "sha512"), m = Vr.createDecipheriv(n, g, d);
      return _ && m.setAuthTag(_), Tn(Vs([m.update(v), m.final()]));
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
      return typeof t == "string" ? t : Tn(t);
    throw new Error("Failed to decrypt config data.");
  }
  _handleStoreChange(t) {
    let r = this.store;
    const n = () => {
      const s = r, a = this.store;
      ui(a, s) || (r = a, t.call(this, a, s));
    };
    return this.events.addEventListener("change", n), () => {
      this.events.removeEventListener("change", n);
    };
  }
  _handleValueChange(t, r) {
    let n = t();
    const s = () => {
      const a = n, o = t();
      ui(o, a) || (n = o, r.call(this, o, a));
    };
    return this.events.addEventListener("change", s), () => {
      this.events.removeEventListener("change", s);
    };
  }
  _validate(t) {
    if (!Z(this, Ct) || Z(this, Ct).call(this, t) || !Z(this, Ct).errors)
      return;
    const n = Z(this, Ct).errors.map(({ instancePath: s, message: a = "" }) => `\`${s.slice(1)}\` ${a}`);
    throw new Error("Config schema violation: " + n.join("; "));
  }
  _ensureDirectory() {
    x.mkdirSync(se.dirname(this.path), { recursive: !0 });
  }
  _write(t) {
    let r = this._serialize(t);
    const n = Z(this, Dt);
    if (n) {
      const s = Vr.randomBytes(16), a = Vr.pbkdf2Sync(n, s, 1e4, 32, "sha512"), o = Vr.createCipheriv(Z(this, Zt), a, s), l = Vs([o.update(Ls(r)), o.final()]), c = [s, Ls(":"), l];
      Z(this, Zt) === "aes-256-gcm" && c.push(o.getAuthTag()), r = Vs(c);
    }
    if (me.env.SNAP)
      x.writeFileSync(this.path, r, { mode: Z(this, Ue).configFileMode });
    else
      try {
        Jc(this.path, r, { mode: Z(this, Ue).configFileMode });
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
      Z(this, ut) ?? ze(this, ut, yc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 100 }));
      const t = se.dirname(this.path), r = se.basename(this.path);
      ze(this, er, x.watch(t, { persistent: !1, encoding: "utf8" }, (n, s) => {
        s && s !== r || typeof Z(this, ut) == "function" && Z(this, ut).call(this);
      }));
    } else
      Z(this, ut) ?? ze(this, ut, yc(() => {
        this.events.dispatchEvent(new Event("change"));
      }, { wait: 1e3 })), x.watchFile(this.path, { persistent: !1 }, (t, r) => {
        typeof Z(this, ut) == "function" && Z(this, ut).call(this);
      }), ze(this, wr, !0);
  }
  _migrate(t, r, n) {
    let s = this._get(zs, "0.0.0");
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
        c == null || c(this), this._set(zs, l), s = l, o = structuredClone(this.store);
      } catch (c) {
        this.store = o;
        const d = c instanceof Error ? c.message : String(c);
        throw new Error(`Something went wrong during the migration! Changes applied to the store until this failed migration will be restored. ${d}`);
      }
    (this._isVersionInRangeFormat(s) || !ur.eq(s, r)) && this._set(zs, r);
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
    return t === jt || t.startsWith(`${jt}.`);
  }
  _isVersionInRangeFormat(t) {
    return ur.clean(t) === null;
  }
  _shouldPerformMigration(t, r, n) {
    return this._isVersionInRangeFormat(t) ? r !== "0.0.0" && ur.satisfies(r, t) ? !1 : ur.satisfies(n, t) : !(ur.lte(t, r) || ur.gt(t, n));
  }
  _get(t, r) {
    return fi(this.store, t, r);
  }
  _set(t, r) {
    const { store: n } = this;
    ln(n, t, r), this.store = n;
  }
}
Ct = new WeakMap(), Dt = new WeakMap(), Zt = new WeakMap(), Ue = new WeakMap(), Xe = new WeakMap(), xt = new WeakMap(), er = new WeakMap(), wr = new WeakMap(), ut = new WeakMap(), Pe = new WeakSet(), Vu = function(t) {
  const r = {
    configName: "config",
    fileExtension: "json",
    projectSuffix: "nodejs",
    clearInvalidConfig: !1,
    accessPropertiesByDotNotation: !0,
    configFileMode: 438,
    ...t
  };
  if (r.encryptionAlgorithm ?? (r.encryptionAlgorithm = Vc), !dS(r.encryptionAlgorithm))
    throw new TypeError(`The \`encryptionAlgorithm\` option must be one of: ${[...Mu].join(", ")}`);
  if (!r.cwd) {
    if (!r.projectName)
      throw new Error("Please specify the `projectName` option.");
    r.cwd = nd(r.projectName, { suffix: r.projectSuffix }).config;
  }
  return typeof r.fileExtension == "string" && (r.fileExtension = r.fileExtension.replace(/^\.+/, "")), r;
}, Lu = function(t) {
  if (!(t.schema ?? t.ajvOptions ?? t.rootSchema))
    return;
  if (t.schema && typeof t.schema != "object")
    throw new TypeError("The `schema` option must be an object.");
  const r = Hv.default, n = new g0.Ajv2020({
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
  ze(this, Ct, n.compile(s)), mt(this, Pe, Fu).call(this, t.schema);
}, Fu = function(t) {
  const r = Object.entries(t ?? {});
  for (const [n, s] of r) {
    if (!s || typeof s != "object" || !Object.hasOwn(s, "default"))
      continue;
    const { default: a } = s;
    a !== void 0 && (Z(this, Xe)[n] = a);
  }
}, zu = function(t) {
  t.defaults && Object.assign(Z(this, Xe), t.defaults);
}, Uu = function(t) {
  t.serialize && (this._serialize = t.serialize), t.deserialize && (this._deserialize = t.deserialize);
}, qu = function(t) {
  const r = typeof t.fileExtension == "string" ? t.fileExtension : void 0, n = r ? `.${r}` : "";
  return se.resolve(t.cwd, `${t.configName ?? "config"}${n}`);
}, Ku = function(t) {
  if (t.migrations) {
    mt(this, Pe, Gu).call(this, t), this._validate(this.store);
    return;
  }
  const r = this.store, n = Object.assign(_t(), t.defaults ?? {}, r);
  this._validate(n);
  try {
    di.deepEqual(r, n);
  } catch {
    this.store = n;
  }
}, Gu = function(t) {
  const { migrations: r, projectVersion: n } = t;
  if (r) {
    if (!n)
      throw new Error("Please specify the `projectVersion` option.");
    ze(this, xt, !0);
    try {
      const s = this.store, a = Object.assign(_t(), t.defaults ?? {}, s);
      try {
        di.deepEqual(s, a);
      } catch {
        this._write(a);
      }
      this._migrate(r, n, t.beforeEachMigration);
    } finally {
      ze(this, xt, !1);
    }
  }
};
const { app: zn, ipcMain: oa, shell: hS } = Uc;
let Fc = !1;
const zc = () => {
  if (!oa || !zn)
    throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
  const e = {
    defaultCwd: zn.getPath("userData"),
    appVersion: zn.getVersion()
  };
  return Fc || (oa.on("electron-store-get-data", (t) => {
    t.returnValue = e;
  }), Fc = !0), e;
};
class mS extends fS {
  constructor(t) {
    let r, n;
    if (me.type === "renderer") {
      const s = Uc.ipcRenderer.sendSync("electron-store-get-data");
      if (!s)
        throw new Error("Electron Store: You need to call `.initRenderer()` from the main process.");
      ({ defaultCwd: r, appVersion: n } = s);
    } else oa && zn && ({ defaultCwd: r, appVersion: n } = zc());
    t = {
      name: "config",
      ...t
    }, t.projectVersion || (t.projectVersion = n), t.cwd ? t.cwd = se.isAbsolute(t.cwd) ? t.cwd : se.join(r, t.cwd) : t.cwd = r, t.configName = t.name, delete t.name, super(t);
  }
  static initRenderer() {
    zc();
  }
  async openInEditor() {
    const t = await hS.openPath(this.path);
    if (t)
      throw new Error(t);
  }
}
const ft = new mS(), Hu = se.dirname(Yu(import.meta.url));
process.env.APP_ROOT = se.join(Hu, "..");
const ia = process.env.VITE_DEV_SERVER_URL, IS = se.join(process.env.APP_ROOT, "dist-electron"), Bu = se.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = ia ? se.join(process.env.APP_ROOT, "public") : Bu;
let At;
ca.handle("preferences:get", () => ft.store);
ca.handle(
  "preferences:set",
  (e, t) => (typeof t.locale == "string" && ft.set("locale", t.locale), typeof t.nickname == "string" && ft.set("nickname", t.nickname), typeof t.category == "string" && ft.set("category", t.category), typeof t.role == "string" && ft.set("role", t.role), ft.store)
);
ca.handle("preferences:reset-onboarding", () => (ft.delete("nickname"), ft.delete("category"), ft.delete("role"), ft.store));
function Xu() {
  At = new qc({
    icon: se.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: se.join(Hu, "preload.mjs")
    }
  }), At.webContents.on("did-finish-load", () => {
    At == null || At.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), ia ? At.loadURL(ia) : At.loadFile(se.join(Bu, "index.html"));
}
Un.on("window-all-closed", () => {
  process.platform !== "darwin" && (Un.quit(), At = null);
});
Un.on("activate", () => {
  qc.getAllWindows().length === 0 && Xu();
});
Un.whenReady().then(Xu);
export {
  IS as MAIN_DIST,
  Bu as RENDERER_DIST,
  ia as VITE_DEV_SERVER_URL
};
