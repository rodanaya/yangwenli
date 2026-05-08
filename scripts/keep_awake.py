"""
keep_awake.py — prevent Windows system sleep while a long-running task is
active. Companion to scripts/automated_explore.py for overnight runs.

Uses SetThreadExecutionState with ES_CONTINUOUS | ES_SYSTEM_REQUIRED so
the OS won't go to sleep while this process is alive. Display can still
turn off (no ES_DISPLAY_REQUIRED) — we only need the system to stay up.

Run independently of the harness:
    python scripts/keep_awake.py &

Or invoke from a launcher. Kill with Ctrl-C or by killing the process.
"""
import ctypes
import sys
import time

ES_CONTINUOUS       = 0x80000000
ES_SYSTEM_REQUIRED  = 0x00000001
ES_DISPLAY_REQUIRED = 0x00000002


def main() -> None:
    if not sys.platform.startswith("win"):
        sys.stderr.write("keep_awake.py is Windows-only.\n")
        sys.exit(0)
    flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED
    rc = ctypes.windll.kernel32.SetThreadExecutionState(flags)
    if rc == 0:
        sys.stderr.write("SetThreadExecutionState failed.\n")
        sys.exit(1)
    print(f"Awake wedge active (flags=0x{flags:08x}). System will not sleep.")
    print("Killing this process restores normal sleep behavior.")
    sys.stdout.flush()
    try:
        while True:
            time.sleep(300)  # 5-minute heartbeat
            # Reaffirm — some Windows versions reset thread state on idle.
            ctypes.windll.kernel32.SetThreadExecutionState(flags)
    except KeyboardInterrupt:
        ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
        print("Awake wedge released.")


if __name__ == "__main__":
    main()
