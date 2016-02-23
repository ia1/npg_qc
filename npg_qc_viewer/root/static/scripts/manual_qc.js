/*
* Author:        Marina Gourtovaia
*
* Copyright (C) 2014 Genome Research Ltd.
*
* This file is part of NPG software.
*
* NPG is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
*
* Interface for manual QC.
* Dependencies: jQuery, qc_css_styles, manual_qc_ui
*
*/
/* globals $: false, window: false, document : false */
"use strict";
define(['jquery', './qc_css_styles', './qc_outcomes_view', './mqc_utils', './manual_qc_ui'],
       function (jquery, qc_css_styles, qc_outcomes_view, mqc_utils, NPG) {
/**
 * @module NPG
 */
(function (NPG) {
  /**
   * @module NPG/QC
   */
  (function (QC) {
    var ProdConfiguration = (function() {
      /**
       * Object to keep configuration for resources.
       * @memberof module:NPG/QC
       * @constructor
       * @author jmtc
       */
      function ProdConfiguration (qcOutcomesURL) {
        this.qcOutcomesURL = qcOutcomesURL;
      }

      /**
       * Returns the path for the resourses so it can be used by
       * other objects in the module.
       * @returns {String} Path for resources.
       */
      ProdConfiguration.prototype.getRoot = function() {
        return '/static';
      };

      return ProdConfiguration;
    }) ();
    QC.ProdConfiguration = ProdConfiguration;

    QC.launchManualQCProcesses = function (isRunPage, qcOutcomes, qcOutcomesURL) {
      if (isRunPage != null) {
        var prodConfiguration = new NPG.QC.ProdConfiguration(qcOutcomesURL);
        var rows = [];
        $('.lane_mqc_control').each(function (index, element) {
          var $element = $(element);
          $element.css("padding-right", "5px").css("padding-left", "10px");
          var rptKey = $element.closest('tr').attr('id');
          rows.push(rptKey);
        });
        var prevOutcomes;

        if (isRunPage) {
          prevOutcomes = qcOutcomes.seq;
        } else {
          var control;
          $('.library_mqc_overall_controls').css("padding-right", "0px");
          prevOutcomes = qcOutcomes.lib;
          control.parseLanes(lanes);
          control.prepareMQC(lanes);
        }

        for ( var i = 0; i < rows.length; i++) {
          var c = isRunPage ? new NPG.QC.LaneMQCControl(prodConfiguration) : new NPG.QC.LibraryMQCControl(prodConfiguration);
          c.rowId = rows[i];
          c.rptKey = qc_outcomes_view.rptKeyFromId(c.rowId);
          if ( typeof prevOutcomes[c.rptKey] !== 'undefined' ) {
            c.outcome = prevOutcomes[c.rptKey].mqc_outcome;
          }
          var obj = $(mqc_utils.buildIdSelector(c.rowId)).find('.lane_mqc_control');
          c.linkControl(obj);
        }
      }
    };

    var MQCControl = (function () {
      function MQCControl(abstractConfiguration) {
        this.outcome;  // Current outcome (Is updated when linked to an object in the view)
        this.rowId;
        this.rptKey;
        this.lane_control          = null;  // Container linked to this controller
        this.abstractConfiguration = abstractConfiguration;

        this.TYPE_LIB = 'lib';
        this.TYPE_SEQ = 'seq';

        this.CONFIG_ACCEPTED_PRELIMINARY = 'Accepted preliminary';
        this.CONFIG_REJECTED_PRELIMINARY = 'Rejected preliminary';
        this.CONFIG_ACCEPTED_FINAL       = 'Accepted final';
        this.CONFIG_REJECTED_FINAL       = 'Rejected final';
        this.CONFIG_UNDECIDED            = 'Undecided';
        this.CONFIG_CONTROL_TAG          = 'gui_controller'; //For link in DOM

        //container names
        this.LANE_MQC_WORKING           = 'lane_mqc_working';
        this.LANE_MQC_WORKING_CLASS     = '.' + this.LANE_MQC_WORKING;

        this.LANE_MQC_CONTROL           = 'lane_mqc_control';
        this.LANE_MQC_CONTROL_CLASS     = '.' + this.LANE_MQC_CONTROL;

      }

      /**
       * Checks the current outcome associated with this controller. If it is not final it will make it final
       * will update the value in the model with an async call and update the view.
       */
      MQCControl.prototype.saveAsFinalOutcome = function() {
        var control = this;
        if(this.outcome == this.CONFIG_UNDECIDED) {
          throw new Error('Error: Invalid state');
        }
        if(this.outcome == this.CONFIG_ACCEPTED_PRELIMINARY) {
          this.updateOutcome(this.CONFIG_ACCEPTED_FINAL);
        }
        if(this.outcome == this.CONFIG_REJECTED_PRELIMINARY) {
          this.updateOutcome(this.CONFIG_REJECTED_FINAL);
        }
      };

      /**
       * Methods to deal with background colours.
       */
      MQCControl.prototype.removeAllQCOutcomeCSSClasses = function () {
        var parent = this.lane_control.parent().first();
        qc_css_styles.removePreviousQCOutcomeStyles(parent);
        parent.css("background-color", "");
      };

      MQCControl.prototype.setAcceptedBG = function() {
        this.removeAllQCOutcomeCSSClasses();
        qc_css_styles.displayElementAs(this.lane_control.parent().first(), this.CONFIG_ACCEPTED_FINAL);
      };

      MQCControl.prototype.setRejectedBG = function () {
        this.removeAllQCOutcomeCSSClasses();
        qc_css_styles.displayElementAs(this.lane_control.parent().first(), this.CONFIG_REJECTED_FINAL);
      };

      MQCControl.prototype.removeMQCFormat = function () {
        this.lane_control.parent().removeClass('td_mqc');
        this.lane_control.parent().css('text-align', 'center'); // For firefox
      };

      MQCControl.prototype.addMQCFormat = function () {
        this.lane_control.parent().css('text-align', 'left'); // For firefox
        this.lane_control.parent().addClass('td_mqc');
      };

      MQCControl.prototype.setAcceptedPre = function() {
        this.outcome = this.CONFIG_ACCEPTED_PRELIMINARY;
        this.removeAllQCOutcomeCSSClasses();
        this.lane_control.parent().css("background-color", "#E5F2FF");
        this.lane_control.children('.lane_mqc_save').show();
      };

      MQCControl.prototype.setRejectedPre = function() {
        this.outcome = this.CONFIG_REJECTED_PRELIMINARY;
        this.removeAllQCOutcomeCSSClasses();
        this.lane_control.parent().css("background-color", "#FFDDDD");
        this.lane_control.children('.lane_mqc_save').show();
      };

      MQCControl.prototype.setAcceptedFinal = function() {
        this.outcome = this.CONFIG_ACCEPTED_FINAL;
        this.lane_control.empty();
        this.removeMQCFormat();
        this.setAcceptedBG();
      };

      MQCControl.prototype.setRejectedFinal = function() {
        this.outcome = this.CONFIG_REJECTED_FINAL;
        this.lane_control.empty();
        this.removeMQCFormat();
        this.setRejectedBG();
      };

      MQCControl.prototype.setUndecided = function() {
        this.outcome = this.CONFIG_UNDECIDED;
        this.removeAllQCOutcomeCSSClasses();
        this.lane_control.children('.lane_mqc_save').hide();
      };

      /**
       * Switch the outcome and adjust the view accordingly
       * @param outcome new outcome for the control.
       */
      MQCControl.prototype.updateView = function(outcome) {
        switch (outcome) {
          case this.CONFIG_ACCEPTED_PRELIMINARY : this.setAcceptedPre(); break;
          case this.CONFIG_REJECTED_PRELIMINARY : this.setRejectedPre(); break;
          case this.CONFIG_ACCEPTED_FINAL       : this.setAcceptedFinal(); break;
          case this.CONFIG_REJECTED_FINAL       : this.setRejectedFinal(); break;
          case this.CONFIG_UNDECIDED            : this.setUndecided(); break;
        }
      };

      /**
       * What to do after getting a fail during the json request to update
       * the outcome
       * @param data Data from response
       */
      MQCControl.prototype.processAfterFail = function(jqXHR) {
        var self = this;
        self.lane_control.children('input:radio').val([self.outcome]);
        var errorMessage = null;

        if ( typeof jqXHR.responseJSON === 'object' && typeof jqXHR.responseJSON.error === 'string') {
          errorMessage = $.trim(jqXHR.responseJSON.error);
        } else {
          errorMessage = ( jqXHR.status || '' ) + ' ' + ( jqXHR.statusText || '');
          console.log(jqXHR.responseText);
        }

        new NPG.QC.UI.MQCErrorMessage(errorMessage).toConsole().display();
      };

      /**
       * Links the individual object with an mqc controller so it can allow mqc.
       */
      MQCControl.prototype.linkControl = function(lane_control) {
        lane_control.data(this.CONFIG_CONTROL_TAG, this);
        this.lane_control = lane_control;
        if ( typeof this.outcome  === "undefined") {
          this.generateActiveControls();
        } else if ( this.outcome === this.CONFIG_ACCEPTED_PRELIMINARY
            || this.outcome === this.CONFIG_REJECTED_PRELIMINARY
            || this.outcome === this.CONFIG_UNDECIDED) {
          //If previous outcome is preliminar.
          this.generateActiveControls();
          switch (this.outcome){
            case this.CONFIG_ACCEPTED_PRELIMINARY : this.setAcceptedPre(); break;
            case this.CONFIG_REJECTED_PRELIMINARY : this.setRejectedPre(); break;
            case this.CONFIG_UNDECIDED : this.setUndecided(); break;
          }
        }
      };

      return MQCControl;
    }) ();
    QC.MQCControl = MQCControl;

    var LaneMQCControl = (function () {
      /**
       * Controller for individual lanes GUI.
       * @param abstractConfiguration {Object}
       * @memberof module:NPG/QC
       * @constructor
       */
      function LaneMQCControl(abstractConfiguration) {
        NPG.QC.MQCControl.call(this, abstractConfiguration);
        this.CONFIG_UPDATE_SERVICE = "";
      }

      LaneMQCControl.prototype = new NPG.QC.MQCControl();

      /**
       * Change the outcome.
       */
      LaneMQCControl.prototype.updateOutcome = function(outcome) {
        var self = this;
        if(outcome != self.outcome) {
          //Show progress icon
          self.lane_control.find(self.LANE_MQC_WORKING_CLASS).html("<img src='"
              + this.abstractConfiguration.getRoot()
              + "/images/waiting.gif' width='10' height='10' title='Processing request.'>");

          var query = mqc_utils.buildUpdateQuery(self.TYPE_SEQ, [{rptKey: self.rptKey, mqc_outcome: self.outcome}]);
          console.log(JSON.stringify(query));
          //AJAX call.
          $.ajax({
            url: self.abstractConfiguration.qcOutcomesURL,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(query),
            cache: false
          }).error(function(jqXHR) {
            self.processAfterFail(jqXHR);
          }).success(function (data) {
            self.updateView(outcome);
          }).always(function(){
            //Clear progress icon
            self.lane_control.find(self.LANE_MQC_WORKING_CLASS).empty();
          });
        } else {
          window.console && console.log("Noting to do.");
        }
      };

      /**
       * Builds the gui controls necessary for the mqc operation and passes them to the view.
       */
      LaneMQCControl.prototype.generateActiveControls = function() {
        var lane_control = this.lane_control;
        var self = this;
        var outcomes = [self.CONFIG_ACCEPTED_PRELIMINARY,
                        self.CONFIG_UNDECIDED,
                        self.CONFIG_REJECTED_PRELIMINARY];
        var labels = ["<img src='" +
                      self.abstractConfiguration.getRoot() +
                      "/images/tick.png'  title='Mark lane as preliminary pass'/>", // for accepted
                      '&nbsp;&nbsp;&nbsp;', // for undecided
                      "<img src='" +
                      self.abstractConfiguration.getRoot() +
                      "/images/cross.png' title='Mark lane as preliminary fail'/>"]; // for rejected
        //Remove old working span
        self.lane_control.children(self.LANE_MQC_WORKING_CLASS).remove();
        //Create and add radios
        var name = 'radios_' + self.rowId;
        for(var i = 0; i < outcomes.length; i++) {
          var outcome = outcomes[i];
          var label = labels[i];
          var checked = null;
          if (self.outcome === outcome) {
            checked = true;
          }
          var radio = new NPG.QC.UI.MQCOutcomeRadio(self.rowId, outcome, label, name, checked);
          self.lane_control.append(radio.asObject());
        }
        self.addMQCFormat();
        self.lane_control.append($("<span class='lane_mqc_button lane_mqc_save' title='Save current outcome as final (can not be changed again)'><img src='" +
            self.abstractConfiguration.getRoot() +
            "/images/padlock.png'></span>"));
        self.lane_control.children('.lane_mqc_save').off("click").on("click", function() {
          self.saveAsFinalOutcome();
        });
        if (self.outcome == self.CONFIG_UNDECIDED) {
          self.lane_control.children('.lane_mqc_save').hide();
        }
        //link the radio group to the update function
        $("input[name='" + name + "']").on("change", function () {
          self.updateOutcome(this.value);
        });
        //add a new working span
        self.lane_control.append("<span class='lane_mqc_working' />");
      };

      return LaneMQCControl;
    }) ();

    QC.LaneMQCControl = LaneMQCControl;

    /* Plex */
    var LibraryMQCControl = (function () {
      /**
       * Controller for individual plexes GUI.
       * @param abstractConfiguration {Object}
       * @memberof module:NPG/QC
       * @constructor
       */
      function LibraryMQCControl(abstractConfiguration) {
        NPG.QC.MQCControl.call(this, abstractConfiguration);
        this.CONFIG_UPDATE_SERVICE = "";
      }

      LibraryMQCControl.prototype = new NPG.QC.MQCControl();

      /**
       * Change the outcome.
       */
      LibraryMQCControl.prototype.updateOutcome = function(outcome) {
        var self = this;
        if(outcome != self.outcome) {
          //Show progress icon
          self.lane_control.find(self.LANE_MQC_WORKING_CLASS).html("<img src='"
              + this.abstractConfiguration.getRoot()
              + "/images/waiting.gif' width='10' height='10' title='Processing request.'>");
          var query = mqc_utils.buildUpdateQuery(self.TYPE_LIB, [{rptKey: self.rptKey, mqc_outcome: self.outcome}]);
          console.log(JSON.stringify(query));
          //AJAX call.
          $.ajax({
            url: self.abstractConfiguration.qcOutcomesURL,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(query),
            cache: false
          }).error(function(jqXHR) {
            self.processAfterFail(jqXHR);
          }).success(function (data) {
            self.updateView(outcome);
          }).always(function(){
            //Clear progress icon
            self.lane_control.find(self.LANE_MQC_WORKING_CLASS).empty();
          });
        } else {
          window.console && console.log("Noting to do.");
        }
      };

      /**
       * Builds the gui controls necessary for the mqc operation and passes them
       * to the view.
       */
      LibraryMQCControl.prototype.generateActiveControls = function() {
        var lane_control = this.lane_control;
        var self = this;
        self.id_run    = lane_control.data(this.DATA_ID_RUN);
        self.position  = lane_control.data(this.DATA_POSITION);
        self.tag_index = lane_control.data(this.DATA_TAG_INDEX);
        var outcomes  = [self.CONFIG_ACCEPTED_PRELIMINARY,
                         self.CONFIG_UNDECIDED,
                         self.CONFIG_REJECTED_PRELIMINARY];
        var labels    = ["<img src='" +
                         self.abstractConfiguration.getRoot() +
                         "/images/tick.png'  title='Mark lane as preliminary pass'/>", // for accepted
                         '&nbsp;&nbsp;&nbsp;', // for undecided
                         "<img src='" +
                         self.abstractConfiguration.getRoot() +
                         "/images/cross.png' title='Mark lane as preliminary fail'/>"]; // for rejected
        //Remove old working span
        self.lane_control.children(self.LANE_MQC_WORKING_CLASS).remove();
        //Create and add radios
        var id_pre = self.id_run + '_' + self.position + '_' + self.tag_index;
        var name = 'radios_' + id_pre;
        for(var i = 0; i < outcomes.length; i++) {
          var outcome = outcomes[i];
          var label = labels[i];
          var checked = null;
          if (self.outcome == outcome) {
            checked = true;
          }
          var radio = new NPG.QC.UI.MQCOutcomeRadio(id_pre, outcome, label, name, checked);
          self.lane_control.append(radio.asObject());
        }
        self.addMQCFormat();
        //link the radio group to the update function
        $("input[name='" + name + "']").on("change", function () {
          self.updateOutcome(this.value);
        });
        //add a new working span
        self.lane_control.append("<span class='lane_mqc_working' />");
      };

      LibraryMQCControl.prototype.removeMQCFormat = function () {
        this.lane_control.parent().removeClass('td_library_mqc');
        this.lane_control.parent().css('text-align', 'center'); // For firefox
      };

      LibraryMQCControl.prototype.addMQCFormat = function () {
        this.lane_control.parent().css('text-align', 'left'); // For firefox
        this.lane_control.parent().addClass('td_library_mqc');
      };

      LibraryMQCControl.prototype.setAcceptedFinal = function() {
        this.outcome = this.CONFIG_ACCEPTED_FINAL;
        this.lane_control.empty();
        this.removeMQCFormat();
      };

      LibraryMQCControl.prototype.setRejectedFinal = function() {
        this.outcome = this.CONFIG_REJECTED_FINAL;
        this.lane_control.empty();
        this.removeMQCFormat();
      };

      return LibraryMQCControl;
    }) ();
    QC.LibraryMQCControl = LibraryMQCControl;
    /* Plex */

    var PageMQCControl = (function () {
      function PageMQCControl (abstractConfiguration) {}

      /**
       * Checks if the field passed as parameter is not undefined and different
       * from null. Throws an Error otherwise.
       * @param field what to check.
       */
      PageMQCControl.prototype.validateRequired = function (field){
        if(typeof(field) === "undefined"
            || field == null) {
          throw new Error("Error: Invalid arguments.");
        }
        return;
      };

      return PageMQCControl;
    }) ();
    QC.PageMQCControl = PageMQCControl;

    var LanePageMQCControl = (function () {
      function LanePageMQCControl (abstractConfiguration){
        NPG.QC.PageMQCControl.call(this, abstractConfiguration);
        this.DATA_TAG_INDEX       = 'tag_index';
        this.CURRENT_LANE_OUTCOME = 'current_lane_outcome';
      }

      LanePageMQCControl.prototype = new NPG.QC.PageMQCControl();

      LanePageMQCControl.prototype.initQC = function (mqc_run_data, plexes, targetFunction, mopFunction) {
        var result = null;
        var self = this;
        //Need both a data object and eligible plexes
        if(typeof(mqc_run_data) !== "undefined" && mqc_run_data != null) {
          this.mqc_run_data = mqc_run_data; //Do we need this assignment?
          self.addAllPaddings();
          result = targetFunction(mqc_run_data, this, plexes);
        } else {
          result = mopFunction();
        }
        return result;
      };

      /**
       * Returns true if the current 'lane' (row in the table) is does not have
       * a final outcome.
       * @param mqc_run_data Transfer object with the mqc data. Must include a
       * current_lane_outcome.
       * @returns {Boolean}
       */
      LanePageMQCControl.prototype.checkLaneStatus = function (mqc_run_data) {
        var result = typeof(mqc_run_data.current_lane_outcome) !== "undefined"
                     && mqc_run_data.current_lane_outcome != this.ACCEPTED_FINAL
                     && mqc_run_data.current_lane_outcome != this.REJECTED_FINAL;
        return result;
      };

      //TODO
      /**
       * Uses the data from mqc_run_data (list of qc_tags) to filter the
       * array of lanes from the page. It creates a new array which contains
       * only lanes with tag_indexes which need to be qc'ed (without
       * tag_index in {0, phix}). Internally it also creates an array of lanes
       * which appear in the page but are non_qc_tags. It validates number of
       * lanes processed and number of tags qc + non qc. They should match. If
       * they don't match, generates an error message and throws an Error.
       * @param mqc_run_data data from REST
       * @param lanes dom elements from page
       * @returns {Array}
       */
      LanePageMQCControl.prototype.onlyQCAble = function (mqc_run_data, lanes) {
        this.validateRequired(mqc_run_data);
        if(typeof(lanes) === "undefined"
            || lanes == null) {
          throw new Error("Error: Invalid arguments");
        }
        var lanes_qc_temp = [];
        var lanes_non_qc_temp = [];
        var lanes_checked = 0;
        for(var i = 0; i < lanes.length; i++) {
          var lane = lanes[i];
          var cells = lane.children('.lane_mqc_control');
          for(var j = 0; j < cells.length; j++) {
            var obj = $(cells[j]); //Wrap as an jQuery object.
            var tag_index = obj.data(this.DATA_TAG_INDEX);
            tag_index = String(tag_index);
            if(tag_index !== '') {
              lanes_checked++;
              //tag_index is qc-able
              if($.inArray(tag_index, mqc_run_data.qc_tags) != -1) {
                lanes_qc_temp.push(lane);
              } else {
                if ($.inArray(tag_index, mqc_run_data.non_qc_tags) != -1) {
                  lanes_non_qc_temp.push(lane);
                }
              }
            }
          }
        }
        if(lanes_qc_temp.length + lanes_non_qc_temp.length != lanes_checked) {
          var errorMessage = 'Error: Conflicting data when comparing libraries from LIMS Warehouse and QC database.';
          new NPG.QC.UI.MQCErrorMessage(errorMessage).toConsole().display();
          throw new Error("Error: Conflicting data from LIMS DWH and QC database.");
        }

        return lanes_qc_temp;
      };

      LanePageMQCControl.prototype.addAllPaddings = function () {
        $('.lane_mqc_control').css("padding-right", "5px");
        $('.lane_mqc_control').css("padding-left", "10px");
        $('.library_mqc_overall_controls').css("padding-left", "15px");
      };

      /**
       * Use data from the page to make the first call to REST. Finds rows which
       * need qc, inits qc for those rows. If it is not state for MQC it updates
       * the view with current MQC values.
       * @param id_run
       * @param position
       * @param lanes
       */
      LanePageMQCControl.prototype.prepareMQC = function (id_run, position, lanes) {
        var self = this;
        var jqxhr = $.ajax({
          url: '',
          cache: false
        }).done(function() {
          var mqc_run_data = jqxhr.responseJSON;
          for(var i = 0; i < lanes.length; i++) {
            lanes[i].children('.lane_mqc_control').each(function(j, obj) {
              obj = $(obj);
            });
          }

          //Filter lanes for qc using data from REST
          var onlyQCAble = self.onlyQCAble(mqc_run_data, lanes);


            var overallControls = new NPG.QC.UI.MQCLibraryOverallControls();
            overallControls.setupControls();
            overallControls.init(onlyQCAble);

            self.initQC(mqc_run_data, onlyQCAble,
              function (mqc_run_data, self, onlyQCAble) {
                //Show working icons
                for(var i = 0; i < onlyQCAble.length; i++) {
                  onlyQCAble[i].children('.lane_mqc_control').each(function(j, obj){
                    $(obj).html("<span class='lane_mqc_working'><img src='/static/images/waiting.gif' title='Processing request.'></span>");
                  });
                }
                self.prepareLanes(mqc_run_data, onlyQCAble);
              },
              function () { //There is no mqc because of problems with data
                self.removeAllPaddings();
                return;
              }
            );

        }).fail(function(jqXHR, textStatus, errorThrown) {
          var errorMessage;
          if (jqXHR.responseJSON) {
            errorMessage = jqXHR.responseJSON.error;
          } else {
            errorMessage = errorThrown + " " + textStatus;
          }
          new NPG.QC.UI.MQCErrorMessage(errorMessage).toConsole().display();
        }).always(function(data){
          //Clear progress icon
          $('.lane_mqc_working').empty();
        });
        return;
      };

      LanePageMQCControl.prototype.prepareLanes = function (mqc_run_data, lanes) {
        this.validateRequired(mqc_run_data);
        if(typeof(lanes) === "undefined" || lanes == null) {
          throw new Error("Error: Invalid arguments");
        }
        var self = this;

        $('.lane, .tag_info').css("background-color", "")
                  .removeClass(function (index, css) {
          return (css.match (/qc_outcome[a-zA-Z_]+/gi) || []).join(' ');
        });

        for(var i = 0; i < lanes.length; i++) {
          var cells = lanes[i].children('.lane_mqc_control');
          for(var j = 0; j < cells.length; j++) {
            var obj = $(cells[j]); //Wrap as an jQuery object.
            //Plex from row.
            var tag_index = obj.data(this.DATA_TAG_INDEX);
            //Filling previous outcomes
            if('qc_plex_status' in mqc_run_data && tag_index in mqc_run_data.qc_plex_status) {
              //From REST
              var current_status = mqc_run_data.qc_plex_status[tag_index];
              //To html element, LaneControl will render.
              obj.data('initial', current_status);
            }
            //Set up mqc controlers and link them to the individual lanes.
            var c = new NPG.QC.LibraryMQCControl(self.abstractConfiguration);
            c.linkControl(obj);
          }
        }
      };

      return LanePageMQCControl;
    }) ();
    QC.LanePageMQCControl = LanePageMQCControl;

  }) (NPG.QC || (NPG.QC = {}));
  var QC = NPG.QC;
}) (NPG || (NPG = {}));

return NPG;
});

