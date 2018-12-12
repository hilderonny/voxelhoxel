class VRControls {

    static async isAvailable() {
        const displays = await this.getVRDisplays();
        return displays.length > 0;
    }

    static async getVRDisplays() {
        if (!navigator.getVRDisplays) return [];
        return navigator.getVRDisplays();
    }

    constructor(renderer) {
        this.renderer = renderer;
    }

    enterVR() {
        VRControls.getVRDisplays().then((function (displays) {
            const display = displays[0];
            this.renderer.vr.setDevice(display);
            display.requestPresent([{ source: this.renderer.domElement }]);
        }).bind(this));
    }

}