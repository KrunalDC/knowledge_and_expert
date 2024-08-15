from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles 
from pydantic import BaseModel, Field
from langchain.chains import LLMChain
from fastapi.templating import Jinja2Templates
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
import os

app = FastAPI()

# Set your API key
api_key = "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"

templates = Jinja2Templates(directory="templates")
app.mount("/Content", StaticFiles(directory="Content"), name="Content")

# Define the input structure for symptom details
class SymptomDetail(BaseModel):
    duration_days: int = Field(..., description="Duration of the symptom in days")
    severity: int = Field(..., description="Severity of the symptom on a scale of 1 to 10")

# Define the input structure for patient data including risk factors
class PatientData(BaseModel):
    persistent_cough: SymptomDetail
    weight_loss: SymptomDetail
    fever: SymptomDetail
    night_sweats: SymptomDetail
    fatigue: SymptomDetail
    chest_pain: SymptomDetail
    coughing_blood: SymptomDetail
    hiv_status: bool = Field(..., description="HIV status of the patient (True if HIV positive, False otherwise)")
    history_of_tb: bool = Field(..., description="History of tuberculosis (True if the patient has had TB before)")
    recent_exposure: bool = Field(..., description="Recent exposure to someone with TB (True if there was exposure)")

# Function to assess tuberculosis using LLM and provide recommendations
def assess_tuberculosis_llm(data: PatientData):
    symptoms = {
        "Persistent Cough": data.persistent_cough,
        "Weight Loss": data.weight_loss,
        "Fever": data.fever,
        "Night Sweats": data.night_sweats,
        "Fatigue": data.fatigue,
        "Chest Pain": data.chest_pain,
        "Coughing Blood": data.coughing_blood,
    }

    # Evaluate severity based on duration and severity scale
    severity_score = sum([detail.severity for detail in symptoms.values()])
    long_duration = sum([1 for detail in symptoms.values() if detail.duration_days > 21])  # Consider long if > 3 weeks

    # Risk factors influence
    risk_factor_score = sum([data.hiv_status, data.history_of_tb, data.recent_exposure])

    # Determine likelihood of TB
    if severity_score > 30 or long_duration > 2 or risk_factor_score > 0:
        likelihood = "high"
    else:
        likelihood = "moderate"
    
    symptoms_text = "\n".join([
        f"{symptom}: Duration: {detail.duration_days} days, Severity: {detail.severity}/10"
        for symptom, detail in symptoms.items()
    ])
    
    risk_factors_text = f"""
    HIV Status: {'Positive' if data.hiv_status else 'Negative'}
    History of TB: {'Yes' if data.history_of_tb else 'No'}
    Recent Exposure to TB: {'Yes' if data.recent_exposure else 'No'}
    """

    template = f"""You are a medical expert. Given the following patient symptoms and risk factors, provide a diagnosis:
    
    Symptoms:
    {symptoms_text}
    
    Risk Factors:
    {risk_factors_text}

    The likelihood of tuberculosis is {likelihood}. Based on these symptoms and risk factors, determine the likelihood of tuberculosis and suggest further actions."""

    prompt = PromptTemplate.from_template(template)
    
    # Initialize the OpenAI model
    openai_llm = ChatOpenAI(openai_api_key=api_key, model="gpt-3.5-turbo", temperature=0)
    
    # Create the LLMChain
    chain = LLMChain(llm=openai_llm, prompt=prompt)
    
    # Run the chain to get the diagnosis
    try:
        diagnosis = chain.run(symptoms_text=symptoms_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error in generating diagnosis: " + str(e))
    
    # Generate post-diagnosis recommendations based on the likelihood
    recommendations = []
    if likelihood == "high":
        recommendations.append("Recommend sputum test for TB.")
        recommendations.append("Recommend chest X-ray.")
        recommendations.append("Refer to a TB specialist.")
        if data.hiv_status:
            recommendations.append("Refer to HIV specialist for further assessment.")
    else:
        recommendations.append("Monitor symptoms closely.")
        recommendations.append("Follow up with a general physician.")

    # Return both the diagnosis and the recommendations
    return {"diagnosis": diagnosis, "recommendations": recommendations}

@app.get("/", response_class=HTMLResponse)
def read_index(request: Request):
    return templates.TemplateResponse("Index.html", {"request": request})

# Define the API endpoint for tuberculosis assessment with dynamic data 
@app.post("/diagnose_tb_llm")
def tuberculosis_diagnosis_llm(data: PatientData):
    print(data)
    try:
        result = assess_tuberculosis_llm(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

