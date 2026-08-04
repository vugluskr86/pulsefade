"""Лёгкая статическая проверка шейдеров: зарезервированные слова GLSL ES 3.00,
баланс скобок, неопределённые вызовы и не-ASCII вне комментариев.
Не заменяет glslangValidator, но ловит именно тот класс ошибок, что сработал ('half')."""
import re
import sys

# ESSL 3.00, раздел 3.7 — ключевые слова, зарезервированные для будущего использования.
RESERVED = set("""
common partition active asm class union enum typedef template this packed
goto inline noinline volatile public static extern external interface
long short double half fixed unsigned superp input output
hvec2 hvec3 hvec4 dvec2 dvec3 dvec4 fvec2 fvec3 fvec4
filter sizeof cast namespace using sampler3DRect
attribute varying coherent restrict readonly writeonly resource sample subroutine
""".split())

BUILTINS = set("""
abs acos acosh all any asin asinh atan atanh ceil clamp cos cosh cross degrees
determinant discard dFdx dFdy distance dot equal exp exp2 faceforward floor fract
ftransform fwidth greaterThan greaterThanEqual inverse inversesqrt isinf isnan length
lessThan lessThanEqual log log2 matrixCompMult max min mix mod modf normalize
notEqual outerProduct pow radians reflect refract round roundEven sign sin sinh
smoothstep sqrt step tan tanh texture textureLod textureProj transpose trunc
float int uint bool vec2 vec3 vec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 bvec2 bvec3
bvec4 mat2 mat3 mat4 void return if else for while do break continue in out inout
uniform const struct layout location precision highp mediump lowp flat smooth
main gl_Position gl_FragCoord gl_PointSize gl_FrontFacing gl_PointCoord
""".split())


def strip_comments(src):
    """Возвращает (код без комментариев, список комментариев)."""
    comments = []

    def repl(m):
        comments.append(m.group(0))
        return " " * len(m.group(0))

    src = re.sub(r"/\*.*?\*/", repl, src, flags=re.S)
    src = re.sub(r"//[^\n]*", repl, src)
    return src, comments


def check(name, src):
    problems = []
    code, _ = strip_comments(src)

    for ident in sorted(set(re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", code))):
        if ident in RESERVED:
            line = next((i + 1 for i, l in enumerate(code.split("\n"))
                         if re.search(r"\b%s\b" % re.escape(ident), l)), "?")
            problems.append(f"строка {line}: '{ident}' — зарезервированное слово GLSL ES")

    for line_no, line in enumerate(code.split("\n"), 1):
        if any(ord(ch) > 127 for ch in line):
            problems.append(f"строка {line_no}: не-ASCII вне комментария")

    for open_ch, close_ch in (("{", "}"), ("(", ")")):
        if code.count(open_ch) != code.count(close_ch):
            problems.append(f"дисбаланс {open_ch}{close_ch}: "
                            f"{code.count(open_ch)} против {code.count(close_ch)}")

    defined = set(re.findall(r"\b(?:float|vec[234]|void|int|bool)\s+([A-Za-z_]\w*)\s*\(", code))
    declared = set(re.findall(r"\b(?:in|out|uniform|layout[^;]*?in|layout[^;]*?out)\b[^;]*?\b(\w+)\s*;", code))
    locals_ = set(re.findall(r"\b(?:float|vec[234]|int|bool|mat[234])\s+(\w+)\s*[=;]", code))
    params = set(re.findall(r"\((?:[^()]*)\)", code))
    param_names = set()
    for p in params:
        param_names |= set(re.findall(r"\b(?:float|vec[234]|int|bool)\s+(\w+)", p))

    known = BUILTINS | defined | declared | locals_ | param_names
    for call in sorted(set(re.findall(r"\b([A-Za-z_]\w*)\s*\(", code))):
        if call not in known:
            problems.append(f"вызов неизвестной функции '{call}'")

    print(f"--- {name} ---")
    if problems:
        for p in problems:
            print("  ✗", p)
    else:
        print("  ✓ проблем не найдено")
    return len(problems)


if __name__ == "__main__":
    text = open(sys.argv[1], encoding="utf-8").read()
    total = 0
    for name, body in re.findall(r"export const (\w+) = `(.*?)`;", text, flags=re.S):
        total += check(name, body)
    sys.exit(1 if total else 0)
