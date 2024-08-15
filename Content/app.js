let currentQuestionIndex = 1;
const totalQuestions = 10;

function showNextQuestion() {
    const currentQuestion = document.querySelector(`#question${currentQuestionIndex}`);
    const selectedOption = currentQuestion.querySelector('input[type="radio"]:checked');

    if (!selectedOption) {
        Swal.fire({
            title: 'Error',
            text: 'Please select Yes or No before proceeding.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        return;
    }

    document.getElementById(`question${currentQuestionIndex}`).classList.remove('active');
    currentQuestionIndex++;
    if (currentQuestionIndex > totalQuestions) {
        currentQuestionIndex = totalQuestions;
    }
    document.getElementById(`question${currentQuestionIndex}`).classList.add('active');

    if (currentQuestionIndex === totalQuestions) {
        document.querySelector('.next-button').style.display = 'none';
        document.querySelector('.submit-button').style.display = 'block';
    }
}

function updateValue(value, id) {
    document.getElementById(`sliderValue${id}`).innerText = value;
    const slider = document.getElementById(`slider${id}`);
    const min = slider.min;
    const max = slider.max;
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.backgroundSize = `${percentage}% 100%`;
}

function toggleSliders(questionNumber, show) {
    const sliders = document.getElementById(`sliders${questionNumber}`);
    if (show) {
        sliders.style.display = 'block';
    } else {
        sliders.style.display = 'none';
        const severitySlider = document.getElementById(`sliderSeverity${questionNumber}`);
        const daysSlider = document.getElementById(`sliderDays${questionNumber}`);
        severitySlider.value = 0;
        daysSlider.value = 0;
        updateValue(0, `Severity${questionNumber}`);
        updateValue(0, `Days${questionNumber}`);
    }
}

// Handle form submission
document.getElementById('symptomForm').addEventListener('submit', function (event) {
    event.preventDefault();
    displayLoader()
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const requestData = {
        persistent_cough: {
            duration_days: parseInt(data.persistent_cough_duration || 0, 10),
            severity: parseInt(data.persistent_cough_severity || 0, 10)
        },
        weight_loss: {
            duration_days: parseInt(data.weight_loss_duration || 0, 10),
            severity: parseInt(data.weight_loss_severity || 0, 10)
        },
        fever: {
            duration_days: parseInt(data.fever_duration || 0, 10),
            severity: parseInt(data.fever_severity || 0, 10)
        },
        night_sweats: {
            duration_days: parseInt(data.night_sweats_duration || 0, 10),
            severity: parseInt(data.night_sweats_severity || 0, 10)
        },
        fatigue: {
            duration_days: parseInt(data.fatigue_duration || 0, 10),
            severity: parseInt(data.fatigue_severity || 0, 10)
        },
        chest_pain: {
            duration_days: parseInt(data.chest_pain_duration || 0, 10),
            severity: parseInt(data.chest_pain_severity || 0, 10)
        },
        coughing_blood: {
            duration_days: parseInt(data.coughing_blood_duration || 0, 10),
            severity: parseInt(data.coughing_blood_severity || 0, 10)
        },
        hiv_status: data.hiv_status === "Yes",
        history_of_tb: data.history_of_tb === "Yes",
        recent_exposure: data.recent_exposure === "Yes"
    };

    // Send the data to the backend
    fetch('/diagnose_tb_llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(result => {
            stopLoader();
            console.log('Diagnosis Result:', result);
            let recommendationsHtml = "";
            result.recommendations.forEach((recommendation, index) => {
                recommendationsHtml += `<strong>${index + 1}) ${recommendation}</strong><br>`;
            });

            const fullHtml = `${result.diagnosis}<br><br><strong>Recommendations:</strong><br>${recommendationsHtml}`;
            Swal.fire({
                title: "Result",
                html: fullHtml,
                icon: "warning"
            }).then((result) => {
                location.reload();
            });
        })
        .catch(error => {
            stopLoader();
            console.error('Error:', error);

            // Extracting the error message
            let errorMessage = "An unknown error occurred.";
            if (error.detail) {
                errorMessage = error.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Displaying the error in a SweetAlert
            Swal.fire({
                title: "Error",
                text: `Error: ${errorMessage}`,
                icon: "error",
                confirmButtonText: "OK"
            });
        });
})        
function displayLoader() {
    const overlay = document.getElementById('overlay');
    const loader = document.getElementById('loader');

    // Show the overlay and loader
    overlay.style.display = 'flex';
    loader.style.display = 'block';
}

function stopLoader() {
    const overlay = document.getElementById('overlay');
    const loader = document.getElementById('loader');

    // Hide the overlay and loader
    overlay.style.display = 'none';
    loader.style.display = 'none';
}
