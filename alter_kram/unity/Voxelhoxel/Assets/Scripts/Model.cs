using System.Collections.Generic;
using UnityEngine;

/// Represents a model in Voxelhoxel
public class Model {
    public string Id;
    public List<Color> ColorPalette { get; set; }
    public bool IsComplete { get; set; }
    public List<BoxInfo> Scene { get; set; }
    public Vector3 Position;
    public Vector3 Target;
}

public class BoxInfo {
    public int PaletteIndex;
    public List<Vector3Int> Position;
}
