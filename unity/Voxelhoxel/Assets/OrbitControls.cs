using UnityEngine;
 
// Angepasste Version von https://forum.unity.com/threads/mobile-touch-to-orbit-pan-and-zoom-camera-without-fix-target-in-one-script.522607/#post-3531342
public class OrbitControls : MonoBehaviour {
 
    public Transform target;
    public Vector3 targetOffset;
    public float distance = 10.0f;
    public float maxDistance = 100.0f;
    public float minDistance = 1.0f;
    public float xSpeed = 100.0f;
    public float ySpeed = 100.0f;
    public int yMinLimit = -80;
    public int yMaxLimit = 80;
    public float zoomRate = 20.0f;
 
    private float xDeg = 0.0f;
    private float yDeg = 0.0f;
    private float desiredDistance;
    private Quaternion desiredRotation;
 
    private Vector3 FirstPosition;
    private Vector3 SecondPosition;
    private Vector3 delta;
    private Vector3 lastOffset;
 
 
    void Start() { Init(); }
    void OnEnable() { Init(); }
 
    public void Init()
    {
        //If there is no target, create a temporary target at 'distance' from the cameras current viewpoint
        if (!target)
        {
            GameObject go = new GameObject("Cam Target");
            go.transform.position = transform.position + (transform.forward * distance);
            target = go.transform;
        }
 
        distance = Vector3.Distance(transform.position, target.position);
 
        xDeg = Vector3.Angle(Vector3.right, transform.right);
        yDeg = Vector3.Angle(Vector3.up, transform.up);
    }
 
    /*
      * Camera logic on LateUpdate to only update after all character movement logic has been handled.
      */
    void LateUpdate()
    {

        // If Control and Alt and Middle button? ZOOM!
        
        if (Input.touchCount==2)
        {
            Touch touchZero = Input.GetTouch (0);
 
            Touch touchOne = Input.GetTouch (1);
 
 
 
            Vector2 touchZeroPreviousPosition = touchZero.position - touchZero.deltaPosition;
 
            Vector2 touchOnePreviousPosition = touchOne.position - touchOne.deltaPosition;
 
 
 
            float prevTouchDeltaMag = (touchZeroPreviousPosition - touchOnePreviousPosition).magnitude;
 
            float TouchDeltaMag = (touchZero.position - touchOne.position).magnitude;
 
 
 
            float deltaMagDiff = prevTouchDeltaMag - TouchDeltaMag;
 
            desiredDistance += deltaMagDiff * Time.deltaTime * zoomRate * 0.0025f * Mathf.Abs(desiredDistance);
        }
        // If middle mouse and left alt are selected? ORBIT
        if (Input.touchCount==1 && Input.GetTouch(0).phase == TouchPhase.Moved)
        {
            Vector2 touchposition = Input.GetTouch(0).deltaPosition;
            xDeg += touchposition.x * xSpeed * 0.002f;
            yDeg -= touchposition.y * ySpeed * 0.002f;
            yDeg = ClampAngle(yDeg, yMinLimit, yMaxLimit);
 
        }
        desiredRotation = Quaternion.Euler(yDeg, xDeg, 0);
        transform.rotation = desiredRotation;
 
 
        if (Input.GetMouseButtonDown (1))
        {
            FirstPosition = Input.mousePosition;
            lastOffset = targetOffset;
        }
 
        if (Input.GetMouseButton (1))
        {
            SecondPosition = Input.mousePosition;
            delta = SecondPosition - FirstPosition;
            targetOffset = lastOffset + transform.right * delta.x*0.003f + transform.up * delta.y*0.003f;
 
        }
 
        ////////Orbit Position
 
        // affect the desired Zoom distance if we roll the scrollwheel
        desiredDistance = Mathf.Clamp(desiredDistance, minDistance, maxDistance);

        transform.position = target.position - (desiredRotation * Vector3.forward * desiredDistance) - targetOffset;
 
    }
    private static float ClampAngle(float angle, float min, float max)
    {
        if (angle < -360)
            angle += 360;
        if (angle > 360)
            angle -= 360;
        return Mathf.Clamp(angle, min, max);
    }
}