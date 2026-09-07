using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class EnemyBehavior : MonoBehaviour {

	[SerializeField]
	public float moveSpeed, xFacing;
	private bool isGrounded = false, isBounded;

	AIScript aiScript;

	public Rigidbody2D body;
	public BoxCollider2D myCollider, hurtbox, boundbox;
	Animator myAnimator;

	//deathbody
	public GameObject deathBody;

	// Use this for initialization
	void Start () 
	{
		aiScript = GetComponent<AIScript>();
		body = GetComponent<Rigidbody2D>();
		myCollider = GetComponent<BoxCollider2D>();
		myAnimator = GetComponent<Animator>();
	}
	
	// Update is called once per frame
	void Update () 
	{
		CheckHurt();
	}

	void FixedUpdate ()
	{
		isGrounded = IsGrounded();
		Move();

		//Animation
		Flip();
		Animate();

		if (!hurtbox.enabled)
			Destroy(gameObject);
	}

	public void Move ()
	{
		isBounded = IsBounded();
		if (isBounded) {
			if (xFacing > 0) 
				xFacing = -1;
			else if (xFacing < 0) 
				xFacing = 1;
		}
		body.velocity = new Vector2(xFacing * moveSpeed, body.velocity.y);
	}

	bool IsBounded ()
	{
		Collider2D[] colliders = Physics2D.OverlapBoxAll(
			(Vector2) transform.position + myCollider.offset + new Vector2(xFacing*myCollider.size.x/2, 0), 
			new Vector2(0.1f, myCollider.size.y - 0.3f), 0);

		bool temp = false;
		for (int i=0; i<colliders.Length; i++) {
			string tag = colliders[i].gameObject.tag;
			if (colliders[i].gameObject != gameObject 
				&& (tag.Equals("Terrain"))) 
			{
				temp = true;
				Debug.Log(this + " is bounded");
			}
		}
		return temp;
	}

	bool IsGrounded ()
	{
		if (body.velocity.y <= 0)
		{
			Collider2D[] colliders = Physics2D.OverlapBoxAll(
				(Vector2) transform.position + myCollider.offset + new Vector2(0, -myCollider.size.y/2), 
				new Vector2(myCollider.size.x - 0.03f, 0.1f), 0);

			for (int i=0; i<colliders.Length; i++) {
				string tag = colliders[i].gameObject.tag;
				if (colliders[i].gameObject != gameObject)
				{
					return true;
				}
			}
		}
		return false;
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
				Instantiate(deathBody, transform.position, transform.rotation);
				hurtbox.enabled = false;
			}
		}
	}

	void Flip () 
	{
		Vector2 newScale = transform.localScale;
		newScale.x = -xFacing;
		transform.localScale = newScale;
	} 

	void Animate ()
	{
		myAnimator.SetFloat("speed", 1);

		if (!isGrounded)
		{
			myAnimator.SetLayerWeight(1,1);
		}
		else 
		{
			myAnimator.SetLayerWeight(1,0);
		} 
	}
}
