Outcome:     done
Branch:      stefanvargas100-hue/countdown-recovery; implementation f7f7999 (merged 4061d45 into develop-based isolated checkout).
Changed:     New host publishes one attempt-specific countdown decision; guests follow accepted Cup updates; cancelled race display names restart; PROTO 7 preserves courseTag ghost key.
Checks:      Tests first: both asymmetric boundary splits and race-0 display failed; all four boundary combinations now converge and restart/finish; focused 156/156, full suite 679/679, build and diff check passed.
Simulation:  tools/room-sim.mjs completed all 4 races at 2/4/8 humans and 4 humans with host leaving race 2; rates below are messages/sec average/peak, sent/received.
Rates:       Humans | room S/R | host S/R | guest S/R | new host S/R
Rates:       2 | 19.9/43,19.9/41 | 13/29,6.9/14 | 6.9/14,13/27 | -; 4 | 38/83,113.6/228 | 17.3/41,20.7/42 | 6.9/14,30.9/62 | -; 8 | 69.9/158,487.5/1001 | 21.6/61,48.3/98 | 6.9/14,62.5/129 | -; 4 leaving | 32.5/83,79.1/228 | 17.6/41,21.1/42 | 6.9/14,25.4/62 | 12.1/30,20.4/67.
Not checked: browser or real phones; independent lead/reviewer verification required before merge; original worker and checkout untouched.
Off plan:    none; plain friend races and elimination retain existing behavior.
Trouble:     none; inherited patch was unverified, tested before implementation porting.
