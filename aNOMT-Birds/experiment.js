let chainLink = ''
let maxAttentionFails = 10000
let doAttentionChecks = false

let knockedOut = false
var jsPsych = initJsPsych({
    on_finish: function () {
        if (!chainLink == '' && !knockedOut) {
            window.location = chainLink + "?id=" + sbjID + "&attn=" + attentionFails + "&src=" + source + '&study=' + study
        }
    }
});

let study = jsPsych.data.getURLVariable('study')
if (study === undefined) {
    study = 'unknown'
}

// Make id
let sbjID = jsPsych.data.getURLVariable('id');
if (sbjID === undefined) {
    sbjID = Date.now()
}

// Get attention check counter
let attentionFails = Number(jsPsych.data.getURLVariable('attn'))
if (isNaN(attentionFails)) {
    attentionFails = 0
}

// Get source of participant
let source = jsPsych.data.getURLVariable('src')
if (source === undefined) {
    source = 'unknown'
}

function makeTest(trial) {
    // Add clips in nested timeline
    let trialTimeline = []
    let numFoils = 0
    for (let i = 0; i < 3; i++) {
        let tmp = {
            type: jsPsychAudioKeyboardResponse,
            prompt: '<b>' + keys[i] + '</b>',
            choices: keys,
            trial_ends_after_audio: true,
            post_trial_gap: 250
        }

        // Check if it is the target
        if (i + 1 == trial.TargetLoc) {
            tmp.stimulus = trial.Target
        } else {
            numFoils++
            tmp.stimulus = trial['Foil' + numFoils]
        }

        // Continue if previous trial didn't have a response
        if (i > 0) {
            tmp = {
                timeline: [tmp],
                conditional_function: d => !jsPsych.data.get().last(1).values()[0].response
            }
        }

        trialTimeline.push(tmp)
    }

    return {
        timeline: trialTimeline,
        loop_function: d => !d.values().filter(d => d.response).length,
        data: {
            testTrial: true,
            sbjID: sbjID,
            trialN: trial.TrialNum,
            target: trial.Target,
            foil1: trial.Foil1,
            foil2: trial.Foil2,
            corrRes: keys[trial.TargetLoc - 1]
        }
    }
}

// Timeline
var timeline = [];

timeline.push({
    type: jsPsychBrowserCheck,
    inclusion_function: (data) => {
        return !data.mobile
    },
    exclusion_message: (data) => {
        return `
    <p>You must use a desktop/laptop computer to participate in this
    experiment.</p>
    <p>Please restart the experiment on a desktop/laptop computer.</p>
  `;
    }
})

// Enter full screen
timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: true
})

// Preload
timeline.push({
    type: jsPsychPreload,
    auto_preload: true
});

// Starting gesture for Audio
timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `
<p>In this test, you will be listening to audio clips.</p>
`,
    choices: ['Begin'],
    post_trial_gap: 500
});

// Audio check trial
let audioCheck = {
    type: jsPsychAudioKeyboardResponse,
    prompt: 'Please adjust your audio volume, it should be quiet but audible. Follow the spoken instructions.',
    stimulus: 'SoundCheck.mp3',
    choices: '5',
    trial_ends_after_audio: true,
    post_trial_gap: 250
};

timeline.push({
    timeline: [audioCheck],
    loop_function: d => !jsPsych.pluginAPI.compareKeys(d.values()[0].response, '5')
});

// Instructions
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>This task will test your memory of bird songs.</p>
<p>We will start with birdsongs from a single species that you
will have to remember.</p>
<p>First, you will be presented with a single bird song, remember
it closely.</p>
<p>Press any key to continue.</p>
`,
    post_trial_gap: 500
});

timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>Afterwards, we will test if you can recognize it against two
other similar bird songs from other species.</p>
<p>Press <b>f</b> if the first clip is the bird song you remembered</p>
<p>Press <b>g</b> if the second clip is the bird song you remembered</p>
<p>Press <b>h</b> if the third clip is the bird song you remembered</p>
<p>Clips will play one after another and repeat after the third, you can
respond during any clip.</p>
<p>Respond as quickly and accurately as possible without
sacrificing accuracy.</p>
<p><b>These tests are designed to be hard at times. Take your time but if
you are not sure, take your best guess.</b></p>
<p>Press any key to continue.</p>
`,
    post_trial_gap: 500
});

// Define intro trials
let keys = ['f', 'g', 'h']
let speciesN = 0
for (let trial of trials.slice(0, 18)) {
    if ((trial.TrialNum - 1) % 3 == 0) { // Study trial?
        speciesN++
        // Get target bird
        let target = trial.Target
        target = target.replace(' SHORT', '')
        target = target.slice(0, target.indexOf('.') - 1).trim()
        console.log(target)

        // Learning clip
        timeline.push({
            type: jsPsychAudioKeyboardResponse,
            prompt: 'Bird species ' + speciesN,
            choices: 'NO_KEYS',
            stimulus: target + ' Repeating.mp3',
            trial_ends_after_audio: true,
            post_trial_gap: 250
        })
    }

    timeline.push(makeTest(trial))

    // Add a next trial
    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: 'Response saved. Next trial.',
        trial_duration: 750
    });
}

timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>Now, we will review all six target bird species.</p>
<p>You will be tested on all of them together afterwards.</p>
<p>Each bird species will be presented once.</p>
<p>Press any key to continue.</p>
`,
    post_trial_gap: 500
});

let studyClips = [
    'Acadian Flycatcher Repeating.mp3',
    'American Redstart Repeating.mp3',
    'American Robin Repeating.mp3',
    'Blackpoll Warbler Repeating.mp3',
    'Blackthroated Green Warbler Repeating.mp3',
    'Chipping Sparrow Repeating.mp3'
]

for (let i = 0; i < studyClips.length; i++) {
    timeline.push({
        type: jsPsychAudioKeyboardResponse,
        prompt: 'Bird species ' + (i + 1),
        choices: 'NO_KEYS',
        stimulus: studyClips[i],
        trial_ends_after_audio: true,
        post_trial_gap: 250
    })
}

timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>Now, you will be tested on which bird species you remember.</p>
<p>Within each set of three bird song clips, one of them will be from the six you studied</p>
<p>Press <b>f</b> if the first clip is the bird song you remembered</p>
<p>Press <b>g</b> if the second clip is the bird song you remembered</p>
<p>Press <b>h</b> if the third clip is the bird song you remembered</p>
<p>Clips will play one after another and repeat after the third, you can
respond during any clip.</p>
<p>Respond as quickly and accurately as possible without
sacrificing accuracy.</p>
<p>Press any key to continue.</p>
`,
    post_trial_gap: 500
})

for (let trial of trials.slice(18)) {
    if (doAttentionChecks && trial.TrialNum == 25) {
        timeline.push({
            type: jsPsychAudioKeyboardResponse,
            stimulus: 'AttentionCheck1.mp3',
            prompt: '<b>' + keys[0] + '</b>',
            choices: keys,
            trial_ends_after_audio: true,
            post_trial_gap: 250,
            data: { attentionTrial: true }
        })

        timeline.push({
            type: jsPsychAudioKeyboardResponse,
            stimulus: 'AttentionCheck2.mp3',
            prompt: '<b>' + keys[1] + '</b>',
            choices: keys,
            trial_ends_after_audio: true,
            post_trial_gap: 250,
            conditional_function: d => !jsPsych.data.get().last(1).values()[0].response,
            data: { attentionTrial: true }
        })

        attentionCheck = {
            type: jsPsychAudioKeyboardResponse,
            stimulus: 'AttentionCheck3.mp3',
            prompt: '<b>' + keys[2] + '</b>',
            choices: keys.concat('m'),
            trial_ends_after_audio: true,
            post_trial_gap: 250,
            conditional_function: d => !jsPsych.data.get().last(1).values()[0].response,
            data: { attentionTrial: true }
        }

        timeline.push({
            timeline: [attentionCheck],
            loop_function: d => !jsPsych.data.get().last(1).values()[0].response,
            on_timeline_finish: function () {
                fail = keys.includes(jsPsych.data.get().last(1).values()[0].response)
                attentionFails += fail ? 1 : 0
                if (attentionFails > maxAttentionFails && source == 'prolific') {
                    // Knock out prolific participants
                    knockedOut = true
                    jsPsych.endExperiment('The experiment was ended due to missing too many attention checks.')
                    //window.location = "https://andrexia.com"
                }
            }
        })
    }

    timeline.push(makeTest(trial))

    // Add a next trial
    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: 'Response saved. Next trial.',
        trial_duration: 750
    });
}

// Exit fullscreen
timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: false
})


// End card
timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
<p>You have finished this test, good job!</p>
<p>One more test until you finish!</p>
<p>Press any buttton to continue.</p>
`,
});

// Run
jsPsych.run(timeline);