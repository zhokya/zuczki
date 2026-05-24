// Returns true if the device/browser likely supports a user-triggered fullscreen flow
function canUserEnterFullscreen(): boolean {
    return !!(
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).msFullscreenEnabled
    );
}

// Cross-browser requestFullscreen
async function requestFullscreen(
    el: HTMLElement = document.documentElement
): Promise<boolean> {
    try {
        if (document.fullscreenElement) return true;

        if (el.requestFullscreen) {
            await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
            (el as any).webkitRequestFullscreen();
        } else if ((el as any).msRequestFullscreen) {
            (el as any).msRequestFullscreen();
        } else {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

// Heuristic: desktop users usually know/use fullscreen themselves,
// mobile users often don't or don't have obvious controls.
function shouldAutoForceFullscreen(): boolean {
    const isMobile =
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
            navigator.userAgent
        );

    return isMobile;
}

// Enable aggressive fullscreen attempts on every click/tap
function enableFullscreenOnEveryInteraction(): void {
    const tryFullscreen = (): void => {
        void requestFullscreen();
    };

    // Use pointerdown because fullscreen must usually happen
    // directly inside a user gesture
    window.addEventListener("pointerdown", tryFullscreen, {
        passive: true,
    });

    // Optional fallback
    window.addEventListener("keydown", tryFullscreen);
}

// Main logic
if (!canUserEnterFullscreen() || shouldAutoForceFullscreen()) {
    enableFullscreenOnEveryInteraction();
}
