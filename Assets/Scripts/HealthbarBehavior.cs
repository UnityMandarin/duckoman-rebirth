using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class HealthbarBehavior : MonoBehaviour {

	[SerializeField]
	private GameObject[] hearts;
	private SpriteRenderer[] heartRenderers;
	[SerializeField]
	private Sprite fullHeart, halfHeart, emptyHeart;

	float health;

	// Use this for initialization
	void Start () {
		heartRenderers = new SpriteRenderer[hearts.Length];
		for(int i=0; i<hearts.Length; i++)
			heartRenderers[i] = hearts[i].GetComponent<SpriteRenderer>();
		
		health = hearts.Length;
	}
	
	// Update is called once per frame
	void Update () {
		if (Input.GetKeyDown("1"))
			TakeDamage(2);
		if (Input.GetKeyDown("2"))
			LoseHalfHeart();
		if (Input.GetKeyDown("3"))
			SetHearts(2.5f);
	}

	// one "health" is half a heart
	/*
	void SetHealth (float health)
	{
		for(int i=0; i<heartRenderers.Length; i++)
		{
			if (health > i*2 + 1)
				heartRenderers[i].sprite = fullHeart;
			else if (health == i*2 + 1)
				heartRenderers[i].sprite = halfHeart;		
			else
				heartRenderers[i].sprite = emptyHeart;
		}
	}*/

	void LoseHalfHeart ()
	{
		if (health > 0)
		{
			int i = (int)(health - 0.5f); //get index of current heart

			if (health % 1 > 0) //if current heart is half, set to empty
				heartRenderers[i].sprite = emptyHeart;
			else //if current heart is full, set to half
				heartRenderers[i].sprite = halfHeart;

			health -= 0.5f;
		}
	}

	public void TakeDamage (float damage)
	{
		while (damage > 0)
		{
			LoseHalfHeart();
			damage -= 0.5f;
		}
	}

	void SetHearts (float newHealth)
	{
		health = newHealth;
		int i = 0;
		while (newHealth > 0.5)
		{
			heartRenderers[i].sprite = fullHeart;
			i++;
			newHealth--;
		}
		if (newHealth > 0)
			heartRenderers[i].sprite = halfHeart;
	}

}
