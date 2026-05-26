from crewai import Agent
from textwrap import dedent
from langchain.llms import OpenAI ,Ollama
from langchain.openai import ChatOpenAI


def __init__(self):
    self.OpenAIGPT35 = ChatOpenAI(model_name= "gpt-3.5-terbo",temperature=0.7)
    self.OpenAI4 = ChatOpenAI(model_name="gpt-4",temperature=0.7)
    self.Ollama = Ollama(model="openhermes")


def agent_1(self):
    return Agent(
        role="Define Agent 1 role here",
        backstory= dedent(f"""Define agent backstory here"""),
        goal = dedent(f"""Define agent 1 goal here"""),
        allow_delegation=False,
        verbose=True,
        # tools=[tool_1, tool_2],

    )

def agent_2(self):
    return Agent(
        role="you are the marketing agent ",
        backstory= dedent(f"""Define agent backstory here"""),
        goal = dedent(f"""Define agent 1 goal here"""),
        allow_delegation=False,
        verbose=True,
        # tools=[tool_1, tool_2],

    )
