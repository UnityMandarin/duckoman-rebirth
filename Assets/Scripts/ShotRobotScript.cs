using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ShotRobotScript : MonoBehaviour {

	[SerializeField]
	GameObject spikeShot;
	GameObject currObj=null;
	BoxCollider2D myCollider;
	[SerializeField]
	BoxCollider2D hurtbox;
	Rigidbody2D myBody;
	bool canShoot = true;

	// Use this for initialization
	void Start () {
		myCollider = GetComponent<BoxCollider2D>();
		myBody = GetComponent<Rigidbody2D>();
	}
	
	// Update is called once per frame
	void Update () {
		CheckHurt();
	}

	void FireShot()
	{
		if (canShoot)
		{
			if (currObj != null)
				Destroy(currObj);
			currObj = Instantiate(
				spikeShot, 
				transform.position, 
				transform.rotation
			);
		}
	}

	void CheckHurt ()
	{
		Collider2D[] colliders = Physics2D.OverlapBoxAll(
			(Vector2) transform.position + myCollider.offset, 
			myCollider.size, 0);

		for (int i=0; i<colliders.Length; i++) {
			string tag = colliders[i].gameObject.tag;
			if (tag.Equals("PlayerAttack"))
			{
				canShoot = false;
				myCollider.enabled = false;
				hurtbox.enabled = false;
				myBody.velocity = new Vector2(2, 2);
				transform.localScale = new Vector2(1, -1);
			}
		}
	}
}
