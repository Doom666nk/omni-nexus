"use client"

interface WakeLockSentinelLike {
  release: () => Promise<void>
  released: boolean
  addEventListener: (type: "release", cb: () => void) => void
}

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> }
}

let sentinel: WakeLockSentinelLike | null = null

export async function acquireWakeLock(): Promise<boolean> {
  if (typeof navigator === "undefined") return false
  const nav = navigator as WakeLockNavigator
  if (!nav.wakeLock) {
    if (process.env.NODE_ENV === "development") {
      console.log("[v0] Wakelock API not supported in this browser")
    }
    return false
  }
  try {
    sentinel = await nav.wakeLock.request("screen")
    sentinel.addEventListener("release", () => {
      if (process.env.NODE_ENV === "development") console.log("[v0] Wakelock released")
    })
    return true
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.log("[v0] Wakelock acquire failed:", err)
    return false
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (sentinel && !sentinel.released) {
    try {
      await sentinel.release()
    } catch {
      /* ignore */
    }
  }
  sentinel = null
}

export function installVisibilityReacquire(): () => void {
  if (typeof document === "undefined") return () => {}
  const handler = async () => {
    if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
      await acquireWakeLock()
    }
  }
  document.addEventListener("visibilitychange", handler)
  return () => document.removeEventListener("visibilitychange", handler)
}
