class VoxelModel {

    static createBox(x, y, z, color) {
        const geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
        const standardMaterial = new THREE.MeshLambertMaterial( { color: color } );
        const mesh = new THREE.Mesh(geometry, standardMaterial);
        mesh.position.x = x;
        mesh.position.y = y;
        mesh.position.z = z;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        return mesh;
    }

    constructor(arrangeModel) {
        this.object3D = new THREE.Object3D();
        this.arrangeModel = arrangeModel;
        const scene = arrangeModel.scene;
        this.boxes = [];
        const zKeys = Object.keys(scene);
        for (var zIndex = 0; zIndex < zKeys.length; zIndex++) {
            const bz = scene[zKeys[zIndex]];
            const z = parseInt(zKeys[zIndex]);
            const yKeys = Object.keys(bz);
            for (var yIndex = 0; yIndex < yKeys.length; yIndex++) {
                const by = bz[yKeys[yIndex]];
                const y = parseInt(yKeys[yIndex]);
                const xKeys = Object.keys(by);
                for (var xIndex = 0; xIndex < xKeys.length; xIndex++) {
                    const colorIndex = by[xKeys[xIndex]];
                    const x = parseInt(xKeys[xIndex]);
                    this.object3D.add(VoxelModel.createBox(x, y, z, this.arrangeModel.colorpalette[colorIndex]));
                }
            }
        }
    }

}