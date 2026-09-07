using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class DuckomanBehavior : MonoBehaviour 
{
	[SerializeField]
	float moveSpeed, jumpSpeed;
	float xInput=0, yInput=0;
	int xFacing = 1;
	public bool isGrounded, isJumping;
	bool isFalling, canMove, isKnockedBack, isInvuln, isBouncing;
	int crouching;
	Vector2 knockback = new Vector2(0,0);

	//timers
	float jumpTimer = -1;
	float recoveryTimer = -1;
	float invulnTimer = -1;

	float health = 3;
	HealthbarBehavior healthbar;

	GameObject pickup;

	//animation variables
	bool animateJump, animateHurt, animateRecovery;
	Color original, transparent;
	
	Rigidbody2D body;
	Animator myAnimator;
	SpriteRenderer myRenderer;

	[SerializeField]
	GameObject respawner;
	[SerializeField]
	BoxCollider2D myCollider, jumpCollider;



	void Start () 
	{
		isGrounded = false;
		canMove=true;

		animateJump = false;
		animateHurt = false;
		animateRecovery = false;

		body = GetComponent<Rigidbody2D>();
		myAnimator = GetComponent<Animator>();
		myRenderer = GetComponent<SpriteRenderer>();
		//colors
		original = myRenderer.material.color;
		transparent = new Color(original.r, original.g, original.b, 0.5f);

		healthbar = GameObject.Find("Healthbar").GetComponent<HealthbarBehavior>();
	}

	void Update ()
	{
		if (recoveryTimer > -1) 
		{
			recoveryTimer -= Time.deltaTime;
			if (recoveryTimer < 0)
			{
				Recover();
				recoveryTimer = -1;
			}
		}

		if (invulnTimer > -1)
		{
			invulnTimer -= Time.deltaTime;
			if (invulnTimer < 0)
			{
				isInvuln = false;
				invulnTimer = -1;
			}
		}

		if (jumpTimer > -1)
		{
			jumpTimer -= Time.deltaTime;
			if (jumpTimer < 0)
				invulnTimer = -1;
		}

		if (health == 0)
		{
			health = -1;
			isFalling = true;
			canMove = false;
			isKnockedBack = true;
			isInvuln = true;
			myCollider.enabled = false;
			Instantiate(respawner);
			Invoke("Die", 2);
		}

		//check stuff
		CheckInput();
		CheckGrounded();
		CheckFalling();
		CheckBouncing();
		CheckHurt();
		CheckInteract();
		Move();
	}

	//FixedUpdate is called at a consistent rate
	void FixedUpdate () 
	{
		//make movement


		//animate
		Flip();
		Animate();
	}





	void CheckInput()
	{
		xInput = Input.GetAxisRaw("Horizontal");
		yInput = Input.GetAxisRaw("Vertical");
		isJumping = (Input.GetKeyDown("l") || Input.GetKeyDown("space"));
	}

	void CheckGrounded ()
	{
		isGrounded = false;

		Collider2D[] colliders = Physics2D.OverlapBoxAll(
			(Vector2) transform.position + myCollider.offset + new Vector2(0, -myCollider.size.y/2), 
			new Vector2(myCollider.size.x - 0.03f, 0.2f), 0);
		
		for (int i=0; i<colliders.Length; i++) {
			string tag = colliders[i].gameObject.tag;
			if (tag.Equals("Terrain"))
			{
				isGrounded = true;
			}
		}
	}

	void CheckFalling ()
	{
		jumpCollider.enabled = (body.velocity.y < -0.01);
		isFalling = (body.velocity.y < -0.01);
	}

	void CheckBouncing ()
	{
		isBouncing = false;

		Collider2D[] colliders = Physics2D.OverlapBoxAll(
			(Vector2) transform.position + myCollider.offset + new Vector2(0, -myCollider.size.y/2), 
			new Vector2(myCollider.size.x - 0.03f, 0.1f), 0);

		for (int i=0; i<colliders.Length; i++) {
			string tag = colliders[i].gameObject.tag;
			if (tag.Equals("Enemy"))
			{
				isBouncing = true;
			}
		}
	}

	void CheckInteract ()
	{
		if (!pickup && isGrounded)
		{
			Collider2D[] colliders = Physics2D.OverlapBoxAll(
				(Vector2) transform.position + myCollider.offset + new Vector2(0, -myCollider.size.y/2), 
				new Vector2(myCollider.size.x - 0.03f, 0.1f), 0);

			for (int i=0; i<colliders.Length; i++) {
				string tag = colliders[i].gameObject.tag;
				if (tag.Equals("PlayerInteract"))
				{
					Pickup(colliders[i].gameObject);
					break;
				}
			}
		}
	}

	void Pickup (GameObject gameObj)
	{
		Debug.Log("Get!");
		pickup = gameObj.transform.parent.gameObject;
		pickup.GetComponent<CircleCollider2D>().isTrigger = true;
		pickup.GetComponent<Rigidbody2D>().simulated = false;
		pickup.transform.parent = transform;
		pickup.transform.localPosition = new Vector3(0.1f, 0.1f, 0);
	}

	void Throw ()
	{
		Debug.Log("Throw!");
		pickup.GetComponent<CircleCollider2D>().isTrigger = false;
		pickup.GetComponent<Rigidbody2D>().simulated = true;
		float speed = 5;
		float angle = 3*Mathf.PI/12;
		pickup.GetComponent<Rigidbody2D>().velocity = new Vector2(
			xFacing*speed*Mathf.Cos(angle), speed*Mathf.Sin(angle));
		pickup.transform.parent = null;
		pickup = null;
	}

	void Move () 
	{
		if (canMove && health > 0)
		{
			if (isJumping)
			{
				if (isGrounded)
				{
					body.velocity = new Vector2(body.velocity.x, jumpSpeed);
					animateJump = true;
					jumpTimer = 0.2f;
				}

				if (pickup)
				{
					Throw();
				}
			}
			else if (isJumping)
				jumpTimer = -1;

			body.velocity = new Vector2(xInput*moveSpeed, body.velocity.y);
		}

		if (isKnockedBack)
		{
			body.velocity = new Vector2(knockback.x, body.velocity.y);
			//vertical component should only happen once
			if (Mathf.Abs(knockback.y) > 0.0001)
			{
				body.velocity = new Vector2(body.velocity.x, knockback.y);
				knockback.y = 0;
			}
		}
		else if (isFalling && isBouncing)
		{
			body.velocity = new Vector2(body.velocity.x, jumpSpeed*0.75f);
			animateJump = true;
		}
	}

	void CheckHurt ()
	{
		if (!isInvuln)
		{
			Collider2D[] colliders = Physics2D.OverlapBoxAll(
				((Vector2)body.transform.position + myCollider.offset), 
				(myCollider.size), 0);

			for (int i=0; i<colliders.Length; i++) {
				string tag = colliders[i].gameObject.tag;
				if (tag.Equals("EnemyAttack"))
				{
					canMove = false;
					isKnockedBack = true;
					isInvuln = true;
					health = Mathf.Clamp(health - 0.5f, 0, 100);
					healthbar.TakeDamage(0.5f);

					if (transform.position.x < colliders[i].transform.position.x)
						knockback = new Vector2(-1,3);
					else
						knockback = new Vector2(1,3);

					recoveryTimer = 0.5f;
					invulnTimer = 2;
					animateHurt = true;

					break;
				}
			}
		}
	}

	void Die ()
	{
		Destroy(gameObject);
	}

	void Recover () 
	{
		canMove = true;
		isKnockedBack = false;
		knockback = new Vector2(0,0);
		animateRecovery = true;
	}
		
	void Flip () 
	{
		if (xInput > 0) {xFacing = 1;}
		else if (xInput < 0) {xFacing = -1;}
		Vector2 newScale = transform.localScale;
		newScale.x = xFacing;
		transform.localScale = newScale;
	} 

	void Animate ()
	{
		myAnimator.SetFloat("speed", Mathf.Abs(xInput));

		if (isInvuln)
		{
			myRenderer.material.color = transparent;
		}
		else
		{
			myRenderer.material.color = original;
		}


		if (isGrounded)
		{
			myAnimator.ResetTrigger("jump");
			myAnimator.SetLayerWeight(1,0);
		}
		else
		{
			myAnimator.SetLayerWeight(1,1);
		}

		if (animateJump)
		{
			myAnimator.SetLayerWeight(1,1);
			myAnimator.SetTrigger("jump");
			animateJump = false;
		}

		if (animateHurt)
		{
			myAnimator.SetLayerWeight(3,1);
			myAnimator.SetTrigger("hurt");
			animateHurt = false;
		}

		if (animateRecovery)
		{
			myAnimator.SetLayerWeight(3,0);
			myAnimator.ResetTrigger("hurt");
			myAnimator.ResetTrigger("punching");
			animateRecovery = false;
		}
	}
}
