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
        //Debug.Log(e.Snapshot.GetRawJsonValue());
        foreach (var model in e.Snapshot.Children)
        {
            var scene = model.Child("scene");
            Debug.Log(model.GetRawJsonValue());
            foreach (var box in scene.Children) {
                var key = box.Key;
                var vec = box.Value;
                Debug.Log(key);
                Debug.Log(vec);
            }
        }
    }

    private void CreateCube (string key, int x, int y, int z) {
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
			
		Mesh mesh = new Mesh();
		mesh.Clear ();
		mesh.vertices = vertices;
		mesh.triangles = triangles;
		mesh.Optimize ();
		mesh.RecalculateNormals ();

        GameObject gameObject = new GameObject("Mesh" + key, typeof(MeshFilter), typeof(MeshRenderer));
        gameObject.GetComponent<MeshFilter>().mesh = mesh;
        //gameObject.transform.parent = GetComponent<GameObject>().transform;
        gameObject.transform.Translate(x, y, z);
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
