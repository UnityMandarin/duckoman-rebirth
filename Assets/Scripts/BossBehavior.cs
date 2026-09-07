using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BossBehavior : MonoBehaviour {

	enum State {Wait, Attack};
	State currState;

	private BoxCollider2D lowerColl, upperColl;
	private Animator myAnim;

	[SerializeField]
	GameObject[] enemies;
	[SerializeField]
	GameObject bossDie;

	int health = 4;
	bool reset = true, hurt = false;
	int waitTime=2;
	int repeat_n=0;
		
	void Start () 
	{
		lowerColl = GetComponent<BoxCollider2D>();
		upperColl = GetComponentInChildren<BoxCollider2D>();

		myAnim = GetComponent<Animator>();
		currState = State.Attack;
	}

	void Update ()
	{
		CheckHurt();
	}

	void FixedUpdate ()  
	{
		if (reset && !hurt)
		{
			reset = false;
			Debug.Log(currState);
			if (currState == State.Attack)
				Attack();
			else if (currState == State.Wait)
				Wait();
		}
	}

	void Wait ()
	{
		reset = false;
		Invoke("Reset", waitTime);
		currState = State.Attack;
	}

	void Attack ()
	{
			if (repeat_n < 6-health) // attack 2-5 times
			{
				RandomAttack();
				repeat_n++;
			}
			else //then shoot big and reset
			{
				repeat_n = 0;
				myAnim.SetTrigger("bigbombattack");
				currState = State.Wait;
			}
	}

	void CheckHurt ()
	{
		if (!hurt)
		{
			Collider2D[] lowerColls = Physics2D.OverlapBoxAll(
				((Vector2)lowerColl.transform.position + lowerColl.offset), 
				(lowerColl.size), 0);
			Collider2D[] upperColls = Physics2D.OverlapBoxAll(
				((Vector2)upperColl.transform.position + upperColl.offset), 
				(upperColl.size), 0);
			Collider2D[] allColls = new Collider2D[lowerColls.Length + upperColls.Length];
			lowerColls.CopyTo(allColls, 0);
			upperColls.CopyTo(allColls, lowerColls.Length);
			

			for (int i=0; i<allColls.Length; i++) 
			{
				string tag = allColls[i].gameObject.tag;
				if (tag.Equals("BossDamage"))
				{
					Hurt();
					break;
				}
			}
		}
	}

	void Hurt ()
	{
		health--;
		myAnim.SetTrigger("hurt");
		if (health <= 0)
		{
			Instantiate(bossDie, transform.position, transform.rotation);
			Destroy(gameObject);
		}
		else
		{
			reset = false;
			hurt = true;
			currState = State.Wait;
		}
	}

	void Reset ()
	{
		reset = true;
		hurt = false;
	}

	void RandomAttack ()
	{
		int rand = Random.Range(1, 3);
		Debug.Log("rand: " + rand);
		if (rand == 1)
			myAnim.SetTrigger("attack1");
		else
			myAnim.SetTrigger("attack2");
	}

	void Shoot (GameObject projectile)
	{
		GameObject proj = Instantiate(
			projectile, 
			transform.position, 
			transform.rotation,
			transform
		);
		Rigidbody2D projBody = proj.GetComponent<Rigidbody2D>();

		float speed = 6;
		float angle = (Mathf.PI/4) + (Random.value*(Mathf.PI/6)); //returns a random value between 3pi/12 and 5pi/12 radians
		projBody.velocity = new Vector2(
			-speed*Mathf.Cos(angle), speed*Mathf.Sin(angle));
	}

	void ShootRandomEnemy ()
	{
		int rand = Random.Range(0, enemies.Length);
		GameObject enemy = Instantiate(
			enemies[rand], 
			transform.position, 
			transform.rotation,
			transform
		);
		Rigidbody2D enemyBody = enemy.GetComponent<Rigidbody2D>();

		float speed = 30;
		float angle = 1*Mathf.PI/12;
		enemyBody.velocity = new Vector2(
			-speed*Mathf.Cos(angle), speed*Mathf.Sin(angle));
	}
}
