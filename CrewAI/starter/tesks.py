from crewai import Task
from textwrap import dedent



class CustomTasks:
    # private method (just for motivation to bot)
    def __tip_section(self):
        return "If you do your Best Work , i'll give you a $10000 commission"
    
    def task_1(self,agent, var1, var2):
        return Task(
            description = dedent(f"""
            Do something as part of task 1

            {self.__tip_section()}

        Make sure use the most recent data as possible


        use this variable:{var1}
        also use this variable:{var2}
"""),
    expected_output ="The expected output of the task",
    agent=agent,


        )