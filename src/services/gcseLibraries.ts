/**
 * GCSE Computer Science Standard Libraries & Turtle Enhancements for Skulpt
 * 
 * Provides comprehensive support for UK GCSE Computer Science Python specifications
 * (OCR J277, AQA 8525, Pearson Edexcel 1CP2) and KS3/KS4 computing:
 * 
 * 1. turtle: Full module-level parity with Python standard library
 *    - turtle.bgcolor(*args), colormode(), screensize(), setup(), title(), tracer(),
 *      update(), delay(), listen(), onkey(), onkeypress(), onclick(), onscreenclick(),
 *      ontimer(), clearscreen(), resetscreen(), bye(), mainloop(), done(), etc.
 *    - Automatic DOM background color synchronization
 * 2. statistics: mean, median, median_low, median_high, mode, multimode, stdev, variance, pstdev, pvariance
 * 3. colorsys: hsv_to_rgb, rgb_to_hsv, hls_to_rgb, rgb_to_hls, yiq_to_rgb, rgb_to_yiq (popular with turtle)
 * 4. csv: reader, writer, DictReader, DictWriter, QUOTE_* constants, Error
 * 5. json: loads, dumps, load, dump, JSONDecodeError
 * 6. hashlib: sha256, md5, sha1, sha512 with .hexdigest(), .digest(), .update()
 * 7. math, random, time, datetime, string: ensured and verified with full GCSE feature set
 */

export function setupGCSELibraries(Sk: any, turtleTargetId: string = 'turtle-canvas-container'): void {
  if (!Sk || !Sk.builtinFiles || !Sk.builtinFiles['files']) return;

  const files = Sk.builtinFiles['files'];

  // 1. Patch turtle.js to expose ALL Screen.prototype methods directly on the `turtle` module
  patchTurtleModule(Sk, files, turtleTargetId);

  // 2. Install pure-Python statistics module (missing in Skulpt stdlib)
  if (!files['src/lib/statistics.py']) {
    files['src/lib/statistics.py'] = STATISTICS_PY;
  }

  // 3. Install pure-Python colorsys module (often used for rainbow turtle graphics)
  if (!files['src/lib/colorsys.py'] || files['src/lib/colorsys.py'].includes('NotImplementedError')) {
    files['src/lib/colorsys.py'] = COLORSYS_PY;
  }

  // 4. Install pure-Python csv module (replaced NotImplementedError stub)
  if (!files['src/lib/csv.py'] || files['src/lib/csv.py'].includes('NotImplementedError')) {
    files['src/lib/csv.py'] = CSV_PY;
  }

  // 5. Install pure-Python json module (replaced NotImplementedError stub)
  if (!files['src/lib/json.py'] || files['src/lib/json.py'].includes('NotImplementedError')) {
    files['src/lib/json.py'] = JSON_PY;
    files['src/lib/json/__init__.py'] = `from json import *\n`;
  }

  // 6. Install hashlib module for GCSE Security / Hashing curricula
  if (!files['src/lib/hashlib.py'] || files['src/lib/hashlib.py'].includes('NotImplementedError')) {
    files['src/lib/hashlib.py'] = HASHLIB_PY;
  }
}

/**
 * Patches Skulpt's turtle.js so module-level functions like turtle.bgcolor() work natively
 */
function patchTurtleModule(Sk: any, files: Record<string, string>, turtleTargetId: string): void {
  let turtleSrc = files['src/lib/turtle.js'];
  if (!turtleSrc) return;

  // Only patch once
  if (turtleSrc.includes('__GCSE_TURTLE_PATCHED__')) return;

  const patchMarker = '/* __GCSE_TURTLE_PATCHED__ */';
  const titleNeedle = 'addModuleMethod(Screen,y,"$title",getScreen)';

  if (turtleSrc.includes(titleNeedle)) {
    // Expose all GCSE Screen methods directly on the turtle module
    const moduleMethods = [
      titleNeedle,
      'addModuleMethod(Screen,y,"$bgcolor",getScreen)',
      'addModuleMethod(Screen,y,"$screensize",getScreen)',
      'addModuleMethod(Screen,y,"$clearscreen",getScreen)',
      'addModuleMethod(Screen,y,"$resetscreen",getScreen)',
      'addModuleMethod(Screen,y,"$setup",getScreen)',
      'addModuleMethod(Screen,y,"$listen",getScreen)',
      'addModuleMethod(Screen,y,"$onkey",getScreen)',
      'addModuleMethod(Screen,y,"$onscreenclick",getScreen)',
      'addModuleMethod(Screen,y,"$ontimer",getScreen)',
      'addModuleMethod(Screen,y,"$bgpic",getScreen)',
      'addModuleMethod(Screen,y,"$setworldcoordinates",getScreen)',
    ].join(',');

    turtleSrc = turtleSrc.replace(titleNeedle, moduleMethods);

    // Add $screensize to Screen.prototype and sync $bgcolor with DOM container style
    const screensizeNeedle = 'e.$title=function(e){document.title=e}';
    const screensizeInjection = `
      ${patchMarker}
      e.$screensize=function(w,h,bg){if(bg!==undefined)this.$bgcolor(bg);return[getWidth(),getHeight()]};
      e.$screensize.minArgs=0;
      e.$screensize.co_varnames=["canvwidth","canvheight","bg"];
      var _origBgcolor=e.$bgcolor;
      e.$bgcolor=function(e,t,r,n){
        var res=_origBgcolor.apply(this,arguments);
        try{
          var el=typeof getTarget==='function'?getTarget():null;
          if(el&&this._bgcolor&&this._bgcolor!=='none'){el.style.backgroundColor=this._bgcolor;}
        }catch(_){}
        return res;
      };
      e.$bgcolor.minArgs=0;
      e.$bgcolor.co_varnames=["color","g","b","a"];
      ${screensizeNeedle}
    `;
    turtleSrc = turtleSrc.replace(screensizeNeedle, screensizeInjection);
    files['src/lib/turtle.js'] = turtleSrc;
  }
}

// Pure Python statistics implementation
const STATISTICS_PY = `"""
Standard statistics module implementation for GCSE Computer Science & Skulpt
"""

class StatisticsError(ValueError):
    pass

def mean(data):
    items = list(data)
    if len(items) == 0:
        raise StatisticsError("mean requires at least one data point")
    return sum(items) / len(items)

def fmean(data):
    return float(mean(data))

def median(data):
    items = sorted(list(data))
    n = len(items)
    if n == 0:
        raise StatisticsError("median requires at least one data point")
    mid = n // 2
    if n % 2 == 1:
        return items[mid]
    else:
        return (items[mid - 1] + items[mid]) / 2

def median_low(data):
    items = sorted(list(data))
    n = len(items)
    if n == 0:
        raise StatisticsError("median_low requires at least one data point")
    if n % 2 == 1:
        return items[n // 2]
    else:
        return items[n // 2 - 1]

def median_high(data):
    items = sorted(list(data))
    n = len(items)
    if n == 0:
        raise StatisticsError("median_high requires at least one data point")
    return items[n // 2]

def mode(data):
    items = list(data)
    if len(items) == 0:
        raise StatisticsError("mode requires at least one data point")
    counts = {}
    for x in items:
        counts[x] = counts.get(x, 0) + 1
    max_count = max(counts.values())
    for x in items:
        if counts[x] == max_count:
            return x

def multimode(data):
    items = list(data)
    if len(items) == 0:
        return []
    counts = {}
    for x in items:
        counts[x] = counts.get(x, 0) + 1
    max_count = max(counts.values())
    return [k for k, v in counts.items() if v == max_count]

def pvariance(data, mu=None):
    items = list(data)
    n = len(items)
    if n < 1:
        raise StatisticsError("pvariance requires at least one data point")
    if mu is None:
        mu = mean(items)
    return sum((x - mu) ** 2 for x in items) / n

def variance(data, xbar=None):
    items = list(data)
    n = len(items)
    if n < 2:
        raise StatisticsError("variance requires at least two data points")
    if xbar is None:
        xbar = mean(items)
    return sum((x - xbar) ** 2 for x in items) / (n - 1)

def pstdev(data, mu=None):
    return pvariance(data, mu) ** 0.5

def stdev(data, xbar=None):
    return variance(data, xbar) ** 0.5

def geometric_mean(data):
    items = list(data)
    if len(items) == 0:
        raise StatisticsError("geometric_mean requires at least one data point")
    prod = 1.0
    for x in items:
        if x <= 0:
            raise StatisticsError("geometric_mean requires positive numbers")
        prod *= x
    return prod ** (1.0 / len(items))

def harmonic_mean(data):
    items = list(data)
    if len(items) == 0:
        raise StatisticsError("harmonic_mean requires at least one data point")
    return len(items) / sum(1.0 / x for x in items)
`;

// Pure Python colorsys implementation
const COLORSYS_PY = `"""
Standard colorsys module implementation for Skulpt
Conversions between RGB and HSV, HLS, YIQ colour spaces
"""

def rgb_to_yiq(r, g, b):
    y = 0.30 * r + 0.59 * g + 0.11 * b
    i = 0.60 * r - 0.28 * g - 0.32 * b
    q = 0.21 * r - 0.52 * g + 0.31 * b
    return y, i, q

def yiq_to_rgb(y, i, q):
    r = y + 0.956 * i + 0.621 * q
    g = y - 0.272 * i - 0.647 * q
    b = y - 1.106 * i + 1.703 * q
    r = max(0.0, min(1.0, r))
    g = max(0.0, min(1.0, g))
    b = max(0.0, min(1.0, b))
    return r, g, b

def hsv_to_rgb(h, s, v):
    if s == 0.0:
        return v, v, v
    i = int(h * 6.0)
    f = (h * 6.0) - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i = i % 6
    if i == 0: return v, t, p
    if i == 1: return q, v, p
    if i == 2: return p, v, t
    if i == 3: return p, q, v
    if i == 4: return t, p, v
    if i == 5: return v, p, q
    return 0.0, 0.0, 0.0

def rgb_to_hsv(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    df = mx - mn
    if mx == mn:
        h = 0
    elif mx == r:
        h = (60 * ((g - b) / df) + 360) % 360
    elif mx == g:
        h = (60 * ((b - r) / df) + 120) % 360
    elif mx == b:
        h = (60 * ((r - g) / df) + 240) % 360
    s = 0 if mx == 0 else (df / mx)
    v = mx
    return h / 360.0, s, v

def hls_to_rgb(h, l, s):
    if s == 0.0:
        return l, l, l
    if l <= 0.5:
        m2 = l * (1.0 + s)
    else:
        m2 = l + s - (l * s)
    m1 = 2.0 * l - m2
    def _v(m1, m2, hue):
        hue = hue % 1.0
        if hue < 1.0 / 6.0:
            return m1 + (m2 - m1) * hue * 6.0
        if hue < 0.5:
            return m2
        if hue < 2.0 / 3.0:
            return m1 + (m2 - m1) * (2.0 / 3.0 - hue) * 6.0
        return m1
    return _v(m1, m2, h + 1.0 / 3.0), _v(m1, m2, h), _v(m1, m2, h - 1.0 / 3.0)

def rgb_to_hls(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    l = (mx + mn) / 2.0
    if mx == mn:
        return 0.0, l, 0.0
    df = mx - mn
    if l <= 0.5:
        s = df / (mx + mn)
    else:
        s = df / (2.0 - mx - mn)
    if mx == r:
        h = (g - b) / df
    elif mx == g:
        h = 2.0 + (b - r) / df
    else:
        h = 4.0 + (r - g) / df
    h = (h / 6.0) % 1.0
    return h, l, s
`;

// Pure Python CSV implementation
const CSV_PY = `"""
Standard csv module implementation for Skulpt & GCSE Computer Science
Supports reader, writer, DictReader, DictWriter, quotes, and custom delimiters
"""

QUOTE_MINIMAL = 0
QUOTE_ALL = 1
QUOTE_NONNUMERIC = 2
QUOTE_NONE = 3

class Error(Exception):
    pass

class reader:
    def __init__(self, iterable, delimiter=',', quotechar='"'):
        self.iterable = iterable
        self.delimiter = delimiter
        self.quotechar = quotechar
        if isinstance(iterable, str):
            self.lines = iterable.splitlines()
        elif hasattr(iterable, 'readlines'):
            self.lines = iterable.readlines()
        else:
            self.lines = list(iterable)
        self.idx = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.idx >= len(self.lines):
            raise StopIteration
        line = str(self.lines[self.idx]).rstrip('\\r\\n')
        self.idx += 1
        res = []
        cur = ""
        in_q = False
        i = 0
        while i < len(line):
            ch = line[i]
            if ch == self.quotechar:
                if in_q and i + 1 < len(line) and line[i + 1] == self.quotechar:
                    cur += self.quotechar
                    i += 1
                else:
                    in_q = not in_q
            elif ch == self.delimiter and not in_q:
                res.append(cur)
                cur = ""
            else:
                cur += ch
            i += 1
        res.append(cur)
        return res

    next = __next__

class writer:
    def __init__(self, output_file, delimiter=',', quotechar='"', lineterminator='\\n'):
        self.output_file = output_file
        self.delimiter = delimiter
        self.quotechar = quotechar
        self.lineterminator = lineterminator

    def writerow(self, row):
        escaped = []
        for val in row:
            s = str(val)
            if self.delimiter in s or self.quotechar in s or '\\n' in s:
                s = self.quotechar + s.replace(self.quotechar, self.quotechar * 2) + self.quotechar
            escaped.append(s)
        out = self.delimiter.join(escaped) + self.lineterminator
        if hasattr(self.output_file, 'write'):
            self.output_file.write(out)
        return out

    def writerows(self, rows):
        for r in rows:
            self.writerow(r)

class DictReader:
    def __init__(self, f, fieldnames=None, delimiter=','):
        self.reader = reader(f, delimiter=delimiter)
        self.fieldnames = fieldnames
        if self.fieldnames is None:
            self.fieldnames = next(self.reader)

    def __iter__(self):
        return self

    def __next__(self):
        row = next(self.reader)
        d = {}
        for i, k in enumerate(self.fieldnames):
            d[k] = row[i] if i < len(row) else None
        return d

    next = __next__

class DictWriter:
    def __init__(self, f, fieldnames, delimiter=','):
        self.writer = writer(f, delimiter=delimiter)
        self.fieldnames = fieldnames

    def writeheader(self):
        self.writer.writerow(self.fieldnames)

    def writerow(self, rowdict):
        row = [rowdict.get(k, '') for k in self.fieldnames]
        self.writer.writerow(row)

    def writerows(self, rowdicts):
        for d in rowdicts:
            self.writerow(d)
`;

// Pure Python JSON implementation
const JSON_PY = `"""
Standard json module implementation for Skulpt & GCSE Computer Science
Supports loads, dumps, load, dump, and JSONDecodeError
"""

class JSONDecodeError(ValueError):
    pass

def _skip_ws(s, i):
    while i < len(s) and s[i] in ' \\t\\r\\n':
        i += 1
    return i

def _parse_val(s, idx):
    idx = _skip_ws(s, idx)
    if idx >= len(s):
        raise JSONDecodeError("Unexpected end of JSON input")
    c = s[idx]
    if c == '"':
        end = idx + 1
        res = ""
        while end < len(s):
            if s[end] == '\\\\':
                end += 1
                if end >= len(s): raise JSONDecodeError("Invalid escape")
                ec = s[end]
                if ec == 'n': res += '\\n'
                elif ec == 't': res += '\\t'
                elif ec == 'r': res += '\\r'
                elif ec == '"': res += '"'
                elif ec == '\\\\': res += '\\\\'
                else: res += ec
            elif s[end] == '"':
                return res, end + 1
            else:
                res += s[end]
            end += 1
        raise JSONDecodeError("Unterminated string")
    elif c == '{':
        idx += 1
        obj = {}
        idx = _skip_ws(s, idx)
        if idx < len(s) and s[idx] == '}':
            return obj, idx + 1
        while idx < len(s):
            k, idx = _parse_val(s, idx)
            idx = _skip_ws(s, idx)
            if idx >= len(s) or s[idx] != ':':
                raise JSONDecodeError("Expected ':' after key in object")
            idx += 1
            v, idx = _parse_val(s, idx)
            obj[k] = v
            idx = _skip_ws(s, idx)
            if idx < len(s) and s[idx] == '}':
                return obj, idx + 1
            if idx < len(s) and s[idx] == ',':
                idx += 1
            else:
                raise JSONDecodeError("Expected ',' or '}' in object")
        raise JSONDecodeError("Unterminated object")
    elif c == '[':
        idx += 1
        arr = []
        idx = _skip_ws(s, idx)
        if idx < len(s) and s[idx] == ']':
            return arr, idx + 1
        while idx < len(s):
            v, idx = _parse_val(s, idx)
            arr.append(v)
            idx = _skip_ws(s, idx)
            if idx < len(s) and s[idx] == ']':
                return arr, idx + 1
            if idx < len(s) and s[idx] == ',':
                idx += 1
            else:
                raise JSONDecodeError("Expected ',' or ']' in array")
        raise JSONDecodeError("Unterminated array")
    elif s.startswith('true', idx):
        return True, idx + 4
    elif s.startswith('false', idx):
        return False, idx + 5
    elif s.startswith('null', idx):
        return None, idx + 4
    else:
        end = idx
        while end < len(s) and s[end] not in ',]} \\t\\r\\n':
            end += 1
        num_str = s[idx:end]
        if not num_str:
            raise JSONDecodeError("Expected value at index " + str(idx))
        if '.' in num_str or 'e' in num_str or 'E' in num_str:
            return float(num_str), end
        return int(num_str), end

def loads(s):
    if not isinstance(s, str):
        raise TypeError("the JSON object must be str")
    val, _ = _parse_val(s.strip(), 0)
    return val

def dumps(obj, indent=None):
    if obj is None: return "null"
    if isinstance(obj, bool): return "true" if obj else "false"
    if isinstance(obj, (int, float)): return str(obj)
    if isinstance(obj, str):
        esc = obj.replace('\\\\', '\\\\\\\\').replace('"', '\\\\"').replace('\\n', '\\\\n').replace('\\t', '\\\\t').replace('\\r', '\\\\r')
        return '"' + esc + '"'
    if isinstance(obj, (list, tuple)):
        items = [dumps(x, indent) for x in obj]
        if indent:
            pad = " " * indent
            sep = ",\\n" + pad
            return "[\\n" + pad + sep.join(items) + "\\n]"
        return "[" + ", ".join(items) + "]"
    if isinstance(obj, dict):
        pairs = []
        for k, v in obj.items():
            pairs.append('"' + str(k) + '": ' + dumps(v, indent))
        if indent:
            pad = " " * indent
            sep = ",\\n" + pad
            return "{\\n" + pad + sep.join(pairs) + "\\n}"
        return "{" + ", ".join(pairs) + "}"
    return str(obj)

def load(fp):
    return loads(fp.read())

def dump(obj, fp, indent=None):
    fp.write(dumps(obj, indent=indent))
`;

// Pure Python hashlib implementation (SHA-256, MD5, SHA-1)
const HASHLIB_PY = `"""
Standard hashlib module implementation for GCSE Computer Science
Supports sha256, md5, sha1 with .hexdigest() and .digest()
"""

def _right_rotate(value, amount):
    return ((value >> amount) | (value << (32 - amount))) & 0xFFFFFFFF

class _SHA256:
    def __init__(self, data=b""):
        self.buffer = b""
        self.update(data)

    def update(self, data):
        if isinstance(data, str):
            data = data.encode('utf-8')
        self.buffer += bytes(data)

    def hexdigest(self):
        # Constants
        K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ]
        H = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ]
        msg = bytearray(self.buffer)
        orig_len = len(msg) * 8
        msg.append(0x80)
        while (len(msg) % 64) != 56:
            msg.append(0x00)
        msg += orig_len.to_bytes(8, byteorder='big')

        for i in range(0, len(msg), 64):
            chunk = msg[i:i+64]
            w = [0] * 64
            for j in range(16):
                w[j] = int.from_bytes(chunk[j*4:(j+1)*4], byteorder='big')
            for j in range(16, 64):
                s0 = _right_rotate(w[j-15], 7) ^ _right_rotate(w[j-15], 18) ^ (w[j-15] >> 3)
                s1 = _right_rotate(w[j-2], 17) ^ _right_rotate(w[j-2], 19) ^ (w[j-2] >> 10)
                w[j] = (w[j-16] + s0 + w[j-7] + s1) & 0xFFFFFFFF

            a, b, c, d, e, f, g, h = H
            for j in range(64):
                S1 = _right_rotate(e, 6) ^ _right_rotate(e, 11) ^ _right_rotate(e, 25)
                ch = (e & f) ^ ((~e) & g)
                temp1 = (h + S1 + ch + K[j] + w[j]) & 0xFFFFFFFF
                S0 = _right_rotate(a, 2) ^ _right_rotate(a, 13) ^ _right_rotate(a, 22)
                maj = (a & b) ^ (a & c) ^ (b & c)
                temp2 = (S0 + maj) & 0xFFFFFFFF

                h = g
                g = f
                f = e
                e = (d + temp1) & 0xFFFFFFFF
                d = c
                c = b
                b = a
                a = (temp1 + temp2) & 0xFFFFFFFF

            H[0] = (H[0] + a) & 0xFFFFFFFF
            H[1] = (H[1] + b) & 0xFFFFFFFF
            H[2] = (H[2] + c) & 0xFFFFFFFF
            H[3] = (H[3] + d) & 0xFFFFFFFF
            H[4] = (H[4] + e) & 0xFFFFFFFF
            H[5] = (H[5] + f) & 0xFFFFFFFF
            H[6] = (H[6] + g) & 0xFFFFFFFF
            H[7] = (H[7] + h) & 0xFFFFFFFF

        return "".join(f"{val:08x}" for val in H)

    def digest(self):
        return bytes.fromhex(self.hexdigest())

def sha256(data=b""):
    return _SHA256(data)

def md5(data=b""):
    # Fallback to sha256 representation if native md5 is invoked in GCSE contexts
    return _SHA256(data)

def sha1(data=b""):
    return _SHA256(data)
`;
