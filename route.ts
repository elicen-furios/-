import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.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
});

export async function POST(req: Request) {

  try {

    const {
      agent,
      message,
      context
    } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json(
        {
          error: "Message is required"
        },
        {
          status: 400
        }
      );
    }

    const instructions = `
You are ${agent} inside "The Agency".

You are a professional AI specialist.

PROJECT CONTEXT:
${context || "No additional context provided."}

USER TASK:
${message}

Your responsibilities:

- Understand the user's objective.
- Give practical and accurate answers.
- Structure complicated tasks clearly.
- Do not pretend that you performed actions you could not perform.
- Never expose API keys, passwords or private secrets.
- For coding tasks, produce maintainable solutions.
- For research, distinguish facts from assumptions.
- For security tasks, remain defensive and authorized.

Act as the selected specialist:
${agent}

Provide the best professional response.
`;

    const response = await client.responses.create({

      model: "gpt-5",

      instructions,

      input: message

    });

    return NextResponse.json({
      answer: response.output_text
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "AI request failed. Check your API key and server."
      },
      {
        status: 500
      }
    );

  }

}