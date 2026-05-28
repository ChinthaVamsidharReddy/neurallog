package com.llmplatform.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class Health {

	@GetMapping("/api/health")
	public String Health() {
		return "llm server Is good condition";
	}
}
