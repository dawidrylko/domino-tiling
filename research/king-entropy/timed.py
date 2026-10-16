"""Run a command, then append wall time and peak RSS of the child to stderr.

usage: python3 timed.py <cmd> [args...]
"""
import resource, subprocess, sys, time

t = time.time()
rc = subprocess.call(sys.argv[1:])
ru = resource.getrusage(resource.RUSAGE_CHILDREN)
print(f'# cmd: {" ".join(sys.argv[1:])}\n# exit={rc} wall={time.time() - t:.1f}s '
      f'user={ru.ru_utime:.1f}s maxrss={ru.ru_maxrss / 1024:.0f}MiB', file=sys.stderr)
sys.exit(rc)
