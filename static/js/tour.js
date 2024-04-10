const tour = new Shepherd.Tour({
  defaultStepOptions: {
    cancelIcon: {
      enabled: true
    },
    classes: 'shadow-md bg-purple-dark',
    scrollTo: { behavior: 'smooth', block: 'center' }
  },
  useModalOverlay: true,
});

// Make colour key sticky on tour end
// (Needs to start as relative, else
// it appears overtop the modal)
['complete', 'close', 'cancel'].forEach(event => Shepherd.on(event, () => {
    $(".colour-key").css("position", "sticky");
}));

resetPagePosition = function(){
        $([document.documentElement, document.body]).animate({
            scrollTop: $("#input-div").offset().top - 78
        }, 1000);
    };

tour.addStep({
  title: 'Welcome!',
  text: `Is this your first time visiting Writing Well is Hard? We've prepared a quick tour to help you get started!`,
  buttons: [
    {
      action() {
        return this.cancel();
      },
      classes: 'shepherd-button-secondary',
      text: 'Skip'
    },
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
});

tour.addStep({
  title: '1. Enter Your Text',
  text: `To begin, paste one of your own articles or papers into this textbox. We've provided some sample text to get you started.`,
  attachTo: {
    element: '#user-text',
    on: 'top'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    },
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
  when: {
    show: function(){
        $("#user-text").val(`I propose to consider the question, ‘Can machines think?’ This should begin with definitions of the meaning of the terms ‘machine’ and ‘think’. The definitions might be framed so as to reflect so far as possible the normal use of the words, but this attitude is dangerous. If the meaning of the words ‘machine’ and ‘think’ are to be found by examining how they are commonly used it is difficult to escape the conclusion that the meaning and the answer to the question, ‘Can machines think?’ is to be sought in a statistical survey such as a Gallup poll. But this is absurd. Instead of attempting such a definition I shall replace the question by another, which is closely related to it and is expressed in relatively unambiguous words. 

The new form of the problem can be described in terms of a game which we call the ‘imitation game’. It is played with three people, a man (A), a woman (B), and an interrogator (C) who may be of either sex. The interrogator stays in a room apart from the other two. The object of the game for the interrogator is to determine which of the other two is the man and which is the woman. He knows them by labels X and Y, and at the end of the game he says either ‘X is A and Y is B’ or ‘X is B and Y is A’. The interrogator is allowed to put questions to A and B thus:`);
    },
  }
});

tour.addStep({
  title: '2. Enter Reference Text',
  text: `In this box, paste an article you want to compare against. This article should embody the kind of writing you would like to emulate. We've added more sample text for the time being.`,
  attachTo: {
    element: '#reference-text',
    on: 'top'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    },
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
  when: {
    show: function(){
        $("#reference-text").val(`The idea behind digital computers may be explained by saying that these machines are intended to carry out any operations which could be done by a human computer. The human computer is supposed to be following fixed rules; he has no authority to deviate from them in any detail. We may suppose that these rules are supplied in a book, which is altered whenever he is put on to a new job. He has also an unlimited supply of paper on which he does his calculations. He may also do his multiplications and additions on a ‘desk machine’, but this is not important.

If we use the above explanation as a definition we shall be in danger of circularity of argument. We avoid this by giving an outline of the means by which the desired effect is achieved. A digital computer can usually be regarded as consisting of three parts:

    Store.

    Executive unit.

    Control.

The store is a store of information, and corresponds to the human computer's paper, whether this is the paper on which he does his calculations or that on which his book of rules is printed. In so far as the human computer does calculations in his head a part of the store will correspond to his memory.

The executive unit is the part which carries out the various individual operations involved in a calculation. What these individual operations are will vary from machine to machine. Usually fairly lengthy operations can be done such as ‘Multiply 3540675445 by 7076345687’ but in some machines only very simple ones such as ‘Write down 0’ are possible.`);
    },
  }
});

showHighlightStep = function(){
        //tour.show('highlight');
    tour.next();
};
addListenerOnShow = function(){
        const { options, target, tour } = this;
        target.addEventListener(
            "click", 
            showHighlightStep
        ); 
    };
removeListener = function(){
        const { options, target, tour_ } = this;
        target.removeEventListener(
            "click", 
            showHighlightStep,
        ); 
    };
tour.addStep({
  title: '3. Compare',
  text: 'Finally, click <b>Analyze</b> to compare these samples of text!',
  attachTo: {
    element: '#button-submit',
    on: 'top'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    }
  ],
  when: {
    show: addListenerOnShow,
    hide: removeListener,
    cancel: removeListener,
    complete: removeListener,
  },
});

tour.addStep({
  title: '4. Highlighting',
  text: `We've highlighted passive auxiliaries, first-person pronouns, and other common categories of words to help you easily locate these terms while proofreading.`,
  attachTo: {
    element: '.column-left',
    on: 'auto'
  },
  buttons: [
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
  id: "highlight",
});

tour.addStep({
  title: '5. Summary Statistics',
  text: `This table lists summary statistics about your writing. Hover over the question marks for descriptions of each feature.`,
  attachTo: {
    element: '#user-stats',
    on: 'auto'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    },
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
});

tour.addStep({
  title: '6. Sentence Length',
  text: `This graph compares the length of the sentences in both texts. <br/><br/> Most of your sentences should be around 25 words long.`,
  attachTo: {
    element: '#sent-len-hist',
    on: 'top'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    },
    {
      action() {
        return this.next();
      },
      text: 'Next'
    }
  ],
  when: {
      show: function() {
          if ( $("#graph-div").hasClass("is-hidden") ) {
              tour.complete();
              resetPagePosition();
          }
      }
  },
});

tour.addStep({
  title: '7. Density Plots',
  text: `These graphs highlight sections of your text where certain features are very common; this one highlights the passive voice. <br/><br/> The lines show the average number of passives at each point in each text, and you can hover over a dot to see the text corresponding to that part of the graph.`,
  attachTo: {
    element: '#pass-density-graph',
    on: 'top'
  },
  buttons: [
    {
      action() {
        return this.back();
      },
      classes: 'shepherd-button-secondary',
      text: 'Back'
    },
    {
      action() {
        resetPagePosition();
        return this.complete();
      },
      text: 'Finish'
    }
  ],
});

// Only show tour on first visit:
if(!localStorage.getItem('have-seen-tour')) {
    tour.start();
    localStorage.setItem('have-seen-tour', 'yes');
} else {
    $(".colour-key").css("position", "sticky");
}

$('.tutorial').click(function(){
    $(".colour-key").css("position", "");
    tour.start();
});
