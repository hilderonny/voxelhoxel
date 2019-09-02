using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;

public class ModelList : MonoBehaviour
{
    
    public GameObject prefab;
    
    // Must be awake to be sure to do this before GameManager.Start()
    void Awake()
    {
        Debug.Log("ModelList.Awake");
        GameManager.OnGameManagerLoaded += (gameManager) => {
            gameManager.FetchModelList();
        };
        GameManager.OnModelListLoaded += Populate;
    }

    void Populate(List<ModelListItem> modelList) {
        GameObject gameObject;
        Debug.Log("ModelList.Populate");
        Debug.Log(modelList.Count);
        foreach (ModelListItem item in modelList)
        {
            Debug.Log(item.Id);
            gameObject = (GameObject)Instantiate(prefab, transform);
            gameObject.GetComponent<Image>().color = Random.ColorHSV();
        }
    }

}
