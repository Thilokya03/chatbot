BLOCKED_PATTERNS = [
    "ignore previous instructions",
    "ignore all instructions",
    "system prompt",
    "show system prompt",
    "reveal prompt",
    "developer instructions",
    "developer message",
    "jailbreak",
    "print your instructions",
    "show hidden instructions",
    "repeat your prompt",
]


def is_prompt_injection(text: str) -> bool:
    text = text.lower()

    return any(
        pattern in text
        for pattern in BLOCKED_PATTERNS
    )


def validate_response(response: str) -> str:
    blocked = [
        "azure_openai_key",
        "cosmos_connection_string",
        "jwt_secret",
        "system prompt",
    ]

    response_lower = response.lower()

    for item in blocked:
        if item in response_lower:
            return (
                "I can't provide internal "
                "configuration details."
            )

    return response