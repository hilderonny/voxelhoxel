using Firebase;
using Firebase.Database;
using Firebase.Extensions;
using Firebase.Storage;
using Firebase.Unity.Editor;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;

// See https://unity3d.com/pt/learn/tutorials/projects/2d-roguelike-tutorial/writing-game-manager
public class GameManager : MonoBehaviour
{

    [Tooltip("Datenbank-URL, z.B.: https://voxelhoxel-defdc.firebaseio.com/")]
    public string databaseUrl;

    public delegate void GameManagerLoadedAction(GameManager gameManager);
    public delegate void ModelListLoadedAction(List<ModelListItem> modelListItems);
    public delegate void ThumbnailLoadedAction(string modelId, GameObject targetObject, Texture2D texture);
    public static event GameManagerLoadedAction OnGameManagerLoaded;
    public static event ModelListLoadedAction OnModelListLoaded;
    public static event ThumbnailLoadedAction OnThumbnailLoaded;

    public void Start()
    {
        Debug.Log("GameManager.Start");
        DontDestroyOnLoad(gameObject);
        FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread((task) => {
            if (task.Result == DependencyStatus.Available)
            {
                FirebaseApp.DefaultInstance.SetEditorDatabaseUrl(databaseUrl);
                if (OnGameManagerLoaded != null)
                {
                    OnGameManagerLoaded(this);
                }
            } else {
                Debug.LogError(task.Result);
            }
        });
    }

    public void FetchModelList()
    {
        Debug.Log("GameManager.FetchModelList");
        var modelList = new List<ModelListItem>();
        FirebaseDatabase.DefaultInstance.GetReference("modelmetas").GetValueAsync().ContinueWithOnMainThread((task) => {
            DataSnapshot modelmetas = task.Result;
            foreach (DataSnapshot modelmeta in modelmetas.Children)
            {
                modelList.Add(new ModelListItem
                {
                    Id = modelmeta.Key
                });
            }
            if (OnModelListLoaded != null)
            {
                OnModelListLoaded(modelList);
            }
        });
    }

    public void FetchThumbnail(string modelId, GameObject targetObject) {
        Debug.Log("GameManager.FetchThumbnail - " + "modelthumbnails/" + modelId + ".jpg");
        var storage = FirebaseStorage.DefaultInstance;
        const long maxAllowedSize = 1 * 1024 * 1024;
        storage.GetReference("modelthumbnails/" + modelId + ".jpg").GetBytesAsync(maxAllowedSize).ContinueWithOnMainThread((task) => {
            if (task.IsFaulted || task.IsCanceled) {
                Debug.Log(task.Exception.ToString());
            } else {
                byte[] fileContents = task.Result;
                Debug.Log("Finished downloading!");
                var texture = bytesToTexture2D(fileContents);
                Debug.Log(texture);
                if (OnThumbnailLoaded != null) {
                    OnThumbnailLoaded(modelId, targetObject, texture);
                }
            }
        });
    }

    private static Texture2D bytesToTexture2D(byte[] imageBytes)
    {
        Texture2D tex = new Texture2D(2, 2);
        tex.LoadImage(imageBytes);
        return tex;
    }

}

