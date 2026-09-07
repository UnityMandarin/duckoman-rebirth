using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class AIScript : MonoBehaviour {

	private float xFacing = -1;
	private bool isBounded;

	// Use this for initialization
	void Start () {
		
	}
	
	// Update is called once per frame
	void Update () {
		
	}

	public void Move (EnemyBehavior enemy)
	{
		isBounded = IsBounded(enemy);
		if (isBounded) {
			if (xFacing > 0) xFacing = -1;
			else if (xFacing < 0) xFacing = 1;
		}
		enemy.body.velocity = new Vector2(xFacing * enemy.moveSpeed, enemy.body.velocity.y);
		enemy.xFacing = xFacing;
	}

	bool IsBounded (EnemyBehavior enemy)
	{
		Collider2D[] colliders = new Collider2D[0];
		if (xFacing < 0 && enemy.body.velocity.x <= 0) //if moving left
		{
			colliders = Physics2D.OverlapBoxAll(
				(Vector2) transform.position + enemy.myCollider.offset - new Vector2(enemy.myCollider.size.x/2, 0), //position
				new Vector2(0.1f, enemy.myCollider.size.y - 0.03f), //size
				0 //angle
			);
		}
		else if (xFacing > 0 && enemy.body.velocity.x >= 0) //if moving right
		{
			colliders = Physics2D.OverlapBoxAll(
				(Vector2) transform.position + enemy.myCollider.offset + new Vector2(enemy.myCollider.size.x/2, 0), //position
				new Vector2(0.1f, enemy.myCollider.size.y - 0.03f), //size
				0 //angle
			);
		}

		for (int i=0; i<colliders.Length; i++) {
			string tag = colliders[i].gameObject.tag;
			if (colliders[i].gameObject != gameObject 
				&& (tag.Equals("Terrain") || tag.Equals("Enemy")))
				return true;
		}
		return false;
	}
}
