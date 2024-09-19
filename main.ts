const kv = await Deno.openKv()

const validateEmail = (email: string) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email) ? email : null
}

const endpoint = async (request: Request) => {
	// If request method is not GET or POST, return 405
	if (!["GET", "POST", "OPTIONS"].includes(request.method))
		return new Response("Method not allowed", { status: 405 })

	// If request method is OPTIONS, return 200
	if (request.method === "OPTIONS")
		return new Response(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST",
				"Access-Control-Allow-Headers": "*"
			}
		})

	// If GET request, return all feedback from KV
	if (request.method === "GET") {
		try {
			const feedbackArray = []
			const feedback = kv.list({ prefix: ["feedback"] })
			for await (const entry of feedback) {
				feedbackArray.push(entry.value)
			}
	
			return new Response(JSON.stringify(feedbackArray), {
				headers: { "content-type": "application/json" }
			})
		} catch (error) {
			console.error(error)
			return new Response("Internal server error", { status: 500 })
		}
	}

	// If POST request, parse the body, validate, and store the feedback
	try {
		const body = await request.json()

		if (!body?.message) return new Response("Message is required", { status: 400 })

		const message = body.message
		const email = validateEmail(body?.email) || "anonymous"

		const feedback = {
			email,
			message,
			dateSubmitted: new Date().toISOString()
		}

		await kv.set(["feedback", email], feedback)
		return new Response("Feedback recieved", { status: 200 })
	} catch (error) {
		console.error(error)
		return new Response("Internal server error", { status: 500 })
	}
}

Deno.serve(endpoint)
