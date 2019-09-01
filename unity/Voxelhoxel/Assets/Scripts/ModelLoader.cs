using System;
using System.Collections.Generic;
using Firebase;
using Firebase.Database;
using Firebase.Extensions;
using Firebase.Unity.Editor;
using UnityEngine;

public class ModelLoader : MonoBehaviour
{

    // Start is called before the first frame update
	void Start () {
        FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread(task => {
            if (task.Result == DependencyStatus.Available)
            {
                Initialize();
            }
            else
            {
                Debug.LogError("Could not resolve all Firebase dependencies: " + task.Result);
            }
        });
    }

    protected virtual void Initialize()
    {
        FirebaseApp app = FirebaseApp.DefaultInstance;
        // NOTE: You'll need to replace this url with your Firebase App's database
        // path in order for the database connection to work correctly in editor.
        app.SetEditorDatabaseUrl("https://voxelhoxel-defdc.firebaseio.com/");
        if (app.Options.DatabaseUrl != null) app.SetEditorDatabaseUrl(app.Options.DatabaseUrl);
        FirebaseDatabase.DefaultInstance.GetReference("models").ValueChanged += ModelLoader_ValueChanged;
    }

    private void ModelLoader_ValueChanged(object sender, ValueChangedEventArgs e)
    {
        if (e.DatabaseError != null)
        {
            Debug.LogError(e.DatabaseError.Message);
            return;
        }
        if (e.Snapshot == null || e.Snapshot.ChildrenCount < 1) return;
        int dz = 0;
        foreach (var model in e.Snapshot.Children)
        {
            var materials = CreateMaterials(model.Child("colorpalette"));
            var scene = model.Child("scene");
            foreach (var xValues in scene.Children) {
                var x = int.Parse(xValues.Key);
                foreach (var yValues in xValues.Children) {
                    var y = int.Parse(yValues.Key);
                    foreach (var zValue in yValues.Children) {
                        var z = Convert.ToInt32(zValue.Key);
                        var paletteIndex = Convert.ToInt32(zValue.Value);
                        CreateCube(x, y, z, materials[paletteIndex]).transform.Translate(0, 0, dz);
                    }
                }
            }
            dz -= 10;
            //return; // After first model
        }
    }

    private List<Material> CreateMaterials(DataSnapshot palette) {
        var shader = Shader.Find("Standard");
        var materials = new List<Material>();
        foreach (var entry in (List<object>)(palette.Value)) {
            Color color;
            ColorUtility.TryParseHtmlString(entry.ToString(), out color);
            var material = new Material(shader);
            material.color = color;
            materials.Add(material);
        }
        return materials;
    }

    private GameObject CreateCube (float x, float y, float z, Material material) {
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.GetComponent<Renderer>().material = material;
        //gameObject.transform.parent = GetComponent<GameObject>().transform;
        cube.transform.Translate(x, y, z);
        return cube;
        /*
		Vector3[] vertices = {
			new Vector3 (0, 0, 0),
			new Vector3 (1, 0, 0),
			new Vector3 (1, 1, 0),
			new Vector3 (0, 1, 0),
			new Vector3 (0, 1, 1),
			new Vector3 (1, 1, 1),
			new Vector3 (1, 0, 1),
			new Vector3 (0, 0, 1),
		};

		int[] triangles = {
			0, 2, 1, //face front
			0, 3, 2,
			2, 3, 4, //face top
			2, 4, 5,
			1, 2, 5, //face right
			1, 5, 6,
			0, 7, 4, //face left
			0, 4, 3,
			5, 4, 7, //face back
			5, 7, 6,
			0, 6, 7, //face bottom
			0, 1, 6
		};
        // Hier müssen noch die Normalen eingebaut werden
        // Da diese aber per Vertex definiert werden, müssen alle Faces eigene
        // Vertexe bekommen.
			
		Mesh mesh = new Mesh();
		mesh.Clear ();
		mesh.vertices = vertices;
		mesh.triangles = triangles;
		mesh.Optimize ();
		mesh.RecalculateNormals ();

        GameObject gameObject = new GameObject("Box", typeof(MeshFilter), typeof(MeshRenderer));
        gameObject.GetComponent<MeshFilter>().mesh = mesh;
        gameObject.GetComponent<Renderer>().material = material;
        //gameObject.transform.parent = GetComponent<GameObject>().transform;
        gameObject.transform.Translate(x, y, z);
        */
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
