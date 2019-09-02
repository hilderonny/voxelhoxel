using Firebase;
using Firebase.Database;
using Firebase.Extensions;
using Firebase.Unity.Editor;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

// See https://unity3d.com/pt/learn/tutorials/projects/2d-roguelike-tutorial/writing-game-manager
public class GameManager : MonoBehaviour
{

    [Tooltip("Datenbank-URL, z.B.: https://voxelhoxel-defdc.firebaseio.com/")]
    public string databaseUrl;

    public delegate void GameManagerLoadedAction(GameManager gameManager);
    public delegate void ModelListLoadedAction(List<ModelListItem> modelListItems);
    public static event GameManagerLoadedAction OnGameManagerLoaded;
    public static event ModelListLoadedAction OnModelListLoaded;

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

}

