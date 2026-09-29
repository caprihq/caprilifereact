#import <React/RCTBridgeModule.h>

/** React Native registration for CapriStartup. See CapriAppGroup.m for why. */
@interface RCT_EXTERN_MODULE (CapriStartup, NSObject)

RCT_EXTERN_METHOD(reportUsable:(NSString *)label
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
