"""Build the Casting page: shell.html plus every script, wrapped in one strict-mode IIFE, as the live artifact expects.
Usage: python3 build.py OUT.html"""
import sys
FILES = ["mocap.js", "engine.js", "mocap-char.js", "rework.js", "rework2.js", "lenses.js", "lenses2.js", "traits.js", "traits2.js", "serve.js", "lab.js"]
shell = open("shell.html").read()
js = "\n".join(open(f).read() for f in FILES)
open(sys.argv[1], "w").write(shell + '\n<script>\n(() => {"use strict";\n' + js + "\n})();\n</script>\n")
print(len(shell + js) // 1024, "kB")
