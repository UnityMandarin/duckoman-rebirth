using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class RobotDieScript : MonoBehaviour {

	float dieTimer = 2;

	// Use this for initialization
	void Start () {
		
	}
	
	// Update is called once per frame
	void Update () {
		dieTimer -= Time.deltaTime;
		if (dieTimer < 0)
		{
			Destroy(gameObject);
		}
	}
}
