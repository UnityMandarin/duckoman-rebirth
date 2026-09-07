using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CameraBehavior : MonoBehaviour {

	[SerializeField]
	private float speed, xMin, yMin, xMax, yMax;
	[SerializeField]
	private Vector2 targetPosition;
	private Vector3 nextPosition;
	private GameObject target;
	private DuckomanBehavior targetScript;

	// Use this for initialization
	void Start () 
	{
		target = GameObject.Find("Duckoman");
	}

	void Update ()
	{
		
	}
	
	// Update is called once per frame
	void LateUpdate () 
	{
		if (target.transform.position.x > -3.36 
			&& target.transform.position.y < 2)
		{
			xMin = 0;
			xMax = 0;
			yMin = 0.25f;
		}
			
		Vector3 currPosition = new Vector3(
			Mathf.Clamp(target.transform.position.x, xMin, xMax),
			Mathf.Clamp(target.transform.position.y, yMin, yMax),
			transform.position.z
		);

		transform.position = currPosition;
	}
}
