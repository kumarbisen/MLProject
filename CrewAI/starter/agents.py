from crewai import Agent
from textwrap import dedent
from langchain_openai import OpenAI, ChatOpenAI
from langchain_ollama import OllamaLLM


class CustomAgents:

    def __init__(self):
        self.OpenAIGPT35 = ChatOpenAI(model_name= "gpt-3.5-terbo",temperature=0.7)
        self.OpenAI4 = ChatOpenAI(model_name="gpt-4",temperature=0.7)
        self.Ollama = OllamaLLM(model="openhermes")


    def agent_1(self):
        return Agent(
            role="you are a coding agent ",
            backstory= dedent(f"""you have more than 10 year of experiance"""),
            goal = dedent(f"""Build a complete fully functional ecoomerce website """),
            allow_delegation=False,
            verbose=True,
            # tools=[tool_1, tool_2],

        )

    def agent_2(self):
        return Agent(
            role="you are the marketing agent ",
            backstory= dedent(f"""You have more than 10 year of experiance make sure our launch product reach to more people """),
            goal = dedent(f"""Make sure you reach to max people"""),
            allow_delegation=False,
            verbose=True,
            # tools=[tool_1, tool_2],

        )
