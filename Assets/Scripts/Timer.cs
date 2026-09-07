using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Timer : ScriptableObject {

	GameObject gameObj;
	public float time { get; set; }
	public delegate void TimerFunc(GameObject gameObj);
	TimerFunc timerFunc;

	public Timer(GameObject gameObj, TimerFunc timerFunc)
	{
		this.gameObj = gameObj;
		time = -1;
		this.timerFunc = timerFunc;
	}

	void Update ()
	{
		if (time > -1)
		{
			Debug.Log(this);
			Debug.Log("Counting Down... " + time);
			time -= Time.deltaTime;
			if (time < 0)
			{
				timerFunc(gameObj);
				time = -1;
			}
		}
	}
}
