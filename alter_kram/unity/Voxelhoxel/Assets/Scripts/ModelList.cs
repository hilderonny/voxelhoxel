using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;

public class ModelList : MonoBehaviour
{
    
    public GameObject prefab;

    private GameManager gameManager;
    
    // Must be awake to be sure to do this before GameManager.Start()
    void Awake()
    {
        Debug.Log("ModelList.Awake");
        GameManager.OnGameManagerLoaded += (gm) => {
            gameManager = gm;
            gameManager.FetchModelList();
        };
        GameManager.OnModelListLoaded += Populate;
        GameManager.OnThumbnailLoaded += ProcessThumbnail;
    }

    void Populate(List<ModelListItem> modelList) {
        GameObject gameObject;
        Debug.Log("ModelList.Populate");
        Debug.Log(modelList.Count);
        foreach (ModelListItem item in modelList)
        {
            Debug.Log(item.Id);
            gameObject = (GameObject)Instantiate(prefab, transform);
            gameManager.FetchThumbnail(item.Id, gameObject);
        }
    }

    void ProcessThumbnail(string modelId, GameObject targetObject, Texture2D thumbnail) {
        Debug.Log("ModelList.ProcessThumbnail");
        var imageComponent = targetObject.GetComponent<Image>();
        //imageComponent.color = Random.ColorHSV();
        imageComponent.sprite = Sprite.Create(thumbnail, new Rect(0, 0, 256, 256), new Vector2());
    }

}
