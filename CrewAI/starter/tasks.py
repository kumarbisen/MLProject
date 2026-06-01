from crewai import Task
from textwrap import dedent



class CustomTasks:
    # private method (just for motivation to bot)
    def __tip_section(self):
        return "If you do your Best Work , i'll give you a $10000 commission"
    
    def task_1_name(self,agent, var1, var2):
        return Task(
            description = dedent(f"""run meta ads

            {self.__tip_section()}

        Make sure use the most recent data as possible


        use this variable:{var1}
        also use this variable:{var2}"""),
        expected_output ="Run meta ads for my store",
        agent=agent,


    )
    
    def task_2_name(self,agent):
        return Task(
            description = dedent(f"""
            write code in react,typescipt in vite 

            {self.__tip_section()}

        Make sure use the most recent data as possible


"""),
            expected_output ="a fully complete website",
            agent=agent,
        )